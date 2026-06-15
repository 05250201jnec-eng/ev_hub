/*
 * EV Hub – IoT Charging Node Firmware (HTTP + OLED Edition)
 * ===========================================================
 * Board    : ESP32 DevKit V1
 * Protocol : HTTP POST to Render server (permanent URL — no Pinggy needed)
 *
 * Wokwi Wiring:
 *   GPIO 15 → Slide Switch (other leg to GND, INPUT_PULLUP)
 *             Slide ON  = LOW  = charger plugged in
 *             Slide OFF = HIGH = charger unplugged
 *   GPIO  2 → Red LED anode → 220Ω → GND  (Charging indicator)
 *   GPIO 32 → Potentiometer middle pin      (Battery % simulation)
 *   GPIO 21 → OLED SDA
 *   GPIO 22 → OLED SCL
 *
 * Libraries needed:
 *   - Adafruit GFX Library
 *   - Adafruit SSD1306
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ── OLED Display ──────────────────────────────────────────────────────────────
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ── Wi-Fi ─────────────────────────────────────────────────────────────────────
const char* ssid     = "Wokwi-GUEST";
const char* password = "";

// ── Server — PERMANENT Render URL (no Pinggy, never expires) ─────────────────
//    ▼ This is the only URL you ever need. Do NOT change this to a Pinggy link.
const char* SERVER_URL = "https://ev-hub-fhid.onrender.com/api/admin/override";

// ── Station Identity ──────────────────────────────────────────────────────────
struct Station {
  const char* id;
  const char* name;
};

const Station stations[] = {
  {"st-001", "Thimphu City Center Charging Hub"},
  {"st-002", "Paro Airport EV Hub"},
  {"st-003", "Punakha Dzong Eco Charger"},
  {"st-004", "Phuentsholing Border Charger"},
  {"st-005", "Bumthang Valley Charging"},
  {"st-006", "Wangdue Phodrang Station"},
  {"st-007", "Trongsa Dzong Hub"},
  {"st-008", "Mongar Town Station"},
  {"st-009", "Trashigang District Hub"},
  {"st-010", "Samdrup Jongkhar Center"},
  {"st-011", "Gelephu City Hub"},
  {"st-012", "Haa Valley Charging"},
  {"st-013", "Samtse Border Hub"},
  {"st-014", "JNEC Solar Charging Hub"}
};
const int NUM_STATIONS = sizeof(stations) / sizeof(Station);
int currentStationIdx = 13; // Default to st-014

String getStationId() { return stations[currentStationIdx].id; }
String getStationName() { return stations[currentStationIdx].name; }

// ── Pin Definitions ───────────────────────────────────────────────────────────
const int SWITCH_PIN = 15;   // Slide switch → GND (INPUT_PULLUP)
const int LED_PIN    = 2;    // Red LED (charging indicator)
const int POT_PIN    = 32;   // Potentiometer (battery % sim)
const int BTN_PIN    = 4;    // Button to change station

// ── State Tracking ────────────────────────────────────────────────────────────
bool lastSwitchState   = false;
int  lastBatteryPct    = -1;
bool lastOledState     = false;
int  lastOledBattery   = -1;
int  lastStationIdx    = currentStationIdx;
bool lastBtnState      = true;

// Rate-limit server calls: send immediately on switch flip,
// then max once every 5 seconds for battery dial changes
unsigned long lastServerUpdate = 0;
const unsigned long SERVER_UPDATE_MS = 5000;

// ── OLED Helper ───────────────────────────────────────────────────────────────
void oledMsg(const char* line1, const char* line2 = "") {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(10, 20);
  display.println(line1);
  if (strlen(line2) > 0) {
    display.setCursor(10, 36);
    display.println(line2);
  }
  display.display();
}

// ── Send HTTP POST to Render ──────────────────────────────────────────────────
void sendStatusUpdate(String status, int batteryPct) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] Wi-Fi not connected — skipping");
    return;
  }

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(8000);   // 8s timeout — Render may be waking from sleep

  // Build JSON payload
  String payload = "{\"stationId\":\"";
  payload += getStationId();
  payload += "\",\"status\":\"";
  payload += status;
  payload += "\",\"battery\":";
  payload += String(batteryPct);
  payload += "}";

  Serial.print("[HTTP] POST → ");
  Serial.println(payload);

  int code = http.POST(payload);

  if (code > 0) {
    Serial.printf("[HTTP] Response %d: %s\n", code, http.getString().c_str());
  } else {
    // Common causes: Render cold-start (wait 30-60s), or network issue
    Serial.printf("[HTTP] Error %d — Render may be waking up, retrying next cycle\n", code);
  }

  http.end();
}

// ── OLED Status Screen ────────────────────────────────────────────────────────
void updateOLED(bool isCharging, int batteryPct) {
  display.clearDisplay();
  display.drawRect(0, 0, 128, 64, SSD1306_WHITE);

  if (!isCharging) {
    // ── Available screen ──
    display.setTextSize(1);
    display.setCursor(8, 6);
    display.print("=== EV STATION ===");

    display.setCursor(15, 20);
    display.print(getStationName());

    display.setCursor(20, 34);
    display.print("Status:  FREE");

    display.setCursor(10, 50);
    display.print("Slide switch to charge");
  } else {
    // ── Charging screen ──
    display.setTextSize(1);
    display.setCursor(20, 6);
    display.print("CHARGING VEHICLE");

    // Big battery % number
    display.setTextSize(2);
    display.setCursor(15, 20);
    display.print(batteryPct);
    display.print("%");

    // Power label
    display.setTextSize(1);
    display.setCursor(72, 26);
    display.print("7.2 kW");

    // Progress bar
    display.drawRect(10, 46, 108, 12, SSD1306_WHITE);
    int barWidth = map(batteryPct, 0, 100, 0, 104);
    display.fillRect(12, 48, barWidth, 8, SSD1306_WHITE);
  }

  display.display();
}

// ── Setup ─────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=== EV Hub IoT Node (HTTP Edition) ===");

  // Pin setup
  pinMode(SWITCH_PIN, INPUT_PULLUP);
  pinMode(BTN_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // I2C + OLED
  Wire.begin(21, 22);
  Serial.println("[OLED] Initializing...");
  bool oledOk = display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  if (!oledOk) oledOk = display.begin(SSD1306_SWITCHCAPVCC, 0x3D);
  if (!oledOk) Serial.println("[OLED] Not found — continuing without display");

  oledMsg("EV Hub Node", "Booting...");

  // Connect Wi-Fi
  Serial.printf("[WiFi] Connecting to %s", ssid);
  WiFi.begin(ssid, password);
  unsigned long wifiStart = millis();
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    if (millis() - wifiStart > 15000) {
      Serial.println("\n[WiFi] Timeout — restarting");
      ESP.restart();
    }
  }
  Serial.printf("\n[WiFi] ✓ Connected! IP: %s\n", WiFi.localIP().toString().c_str());

  oledMsg("WiFi Connected!", getStationName().c_str());
  delay(1200);

  // Show initial available screen
  updateOLED(false, 0);
  Serial.println("[Ready] Waiting for switch input...");
}

// ── Loop ──────────────────────────────────────────────────────────────────────
void loop() {
  bool currentSwitch = (digitalRead(SWITCH_PIN) == LOW);
  bool currentBtn    = (digitalRead(BTN_PIN) == LOW);

  // Read potentiometer → battery percentage
  int potValue     = analogRead(POT_PIN);
  int batteryPct   = map(potValue, 0, 4095, 0, 100);

  // Handle station change button
  if (currentBtn && !lastBtnState && !currentSwitch) {
    currentStationIdx = (currentStationIdx + 1) % NUM_STATIONS;
    Serial.printf("[Station] Changed to %s (%s)\n", getStationId().c_str(), getStationName().c_str());
  }
  lastBtnState = currentBtn;

  unsigned long now      = millis();
  bool switchChanged     = (currentSwitch != lastSwitchState);
  bool batteryChanged    = (abs(batteryPct - lastBatteryPct) >= 2); // ignore < 2% noise
  bool stationChanged    = (currentStationIdx != lastStationIdx);

  // ── Server update ─────────────────────────────────────────────────────────
  // Send immediately on switch flip, or throttled every 5s for battery changes
  bool shouldPost = switchChanged ||
                    (batteryChanged && currentSwitch &&
                     (now - lastServerUpdate >= SERVER_UPDATE_MS));

  if (shouldPost) {
    lastSwitchState  = currentSwitch;
    lastBatteryPct   = batteryPct;
    lastServerUpdate = now;

    if (currentSwitch) {
      digitalWrite(LED_PIN, HIGH);
      Serial.println("[Switch] ON → Charging");
      sendStatusUpdate("charging", batteryPct);
    } else {
      digitalWrite(LED_PIN, LOW);
      Serial.println("[Switch] OFF → Available");
      sendStatusUpdate("available", batteryPct);
    }
  }

  // ── OLED update (instant — no rate limiting) ──────────────────────────────
  if (currentSwitch != lastOledState || batteryPct != lastOledBattery || stationChanged) {
    lastOledState   = currentSwitch;
    lastOledBattery = batteryPct;
    lastStationIdx  = currentStationIdx;
    updateOLED(currentSwitch, batteryPct);
  }

  delay(100);
}
