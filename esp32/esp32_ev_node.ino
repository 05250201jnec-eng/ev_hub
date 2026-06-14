/*
 * EV Hub – IoT Charging Node Firmware
 * =====================================
 * Board    : ESP32 DevKit V1
 * Protocol : Raw WebSocket + Socket.IO message format (no SocketIoClient lib needed)
 *
 * Physical / Wokwi Wiring:
 *   GPIO 18 → Slide Switch (other leg to GND, uses INPUT_PULLUP)
 *              Slide ON  = LOW  = charger plugged in
 *              Slide OFF = HIGH = charger unplugged
 *   GPIO 19 → 220Ω → Green LED anode → GND   (Station available)
 *   GPIO 21 → 220Ω → Red LED anode   → GND   (Charging active)
 *   GPIO 23 → Relay module IN  (optional)
 *
 * Libraries needed (only 2!):
 *   - ArduinoJson  by Benoit Blanchon (v6.x)
 *   - WebSockets   by Markus Sattler
 */

#include <WiFi.h>
#include <ArduinoJson.h>
#include <WebSocketsClient.h>

// ── Wi-Fi Credentials ─────────────────────────────────────────────────────────
const char* WIFI_SSID     = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";

// ── Server ────────────────────────────────────────────────────────────────────
const char* SERVER_HOST = "ev-hub-fhid.onrender.com";
const int   SERVER_PORT = 443;
const char* SERVER_PATH = "/socket.io/?EIO=4&transport=websocket";

// ── Station Identity ──────────────────────────────────────────────────────────
const char* STATION_ID = "st-014";   // JNEC Solar Charging Hub

// ── Pin Definitions ───────────────────────────────────────────────────────────
#define PIN_REED    18
#define PIN_LED_G   19
#define PIN_LED_R   21
#define PIN_RELAY   23

// ── State Machine ─────────────────────────────────────────────────────────────
enum State { OFFLINE, AVAILABLE, CHARGING };
State state = OFFLINE;

bool     pluggedIn       = false;
bool     lastSwitch      = HIGH;
unsigned long lastDebounce = 0;
const unsigned long DEBOUNCE_MS = 80;

unsigned long lastBlink = 0;
bool blinkOn = false;

// ── Pending event queue (fires when WS connects) ──────────────────────────────
// If the switch is flipped before WS is connected, we queue the event
// and send it as soon as the connection is established.
String pendingEvent = "";   // "" = no pending event

// ── WebSocket client ──────────────────────────────────────────────────────────
WebSocketsClient ws;
bool wsConnected     = false;
bool sioPingReceived = false;

// ── Emit a Socket.IO event ────────────────────────────────────────────────────
// Socket.IO over raw WS format: 42["event_name", {"key": "value"}]
// Returns true if sent, false if not connected (queues for later).
bool emitEvent(const char* eventName, const char* stationId) {
  String msg = "42[\"";
  msg += eventName;
  msg += "\",{\"stationId\":\"";
  msg += stationId;
  msg += "\"}]";

  if (!wsConnected) {
    Serial.printf("[IoT] WS not connected yet — queuing event: %s\n", eventName);
    pendingEvent = msg;   // Overwrite with latest intent
    return false;
  }

  ws.sendTXT(msg);
  Serial.printf("[IoT] Emitted: %s\n", msg.c_str());
  return true;
}

// ── LED / Relay control ───────────────────────────────────────────────────────
void setHardwareState() {
  unsigned long now = millis();
  switch (state) {
    case OFFLINE:
      digitalWrite(PIN_RELAY, LOW);
      digitalWrite(PIN_LED_G, LOW);
      if (now - lastBlink > 800) {      // Fast red blink = offline
        lastBlink = now;
        blinkOn = !blinkOn;
        digitalWrite(PIN_LED_R, blinkOn ? HIGH : LOW);
      }
      break;

    case AVAILABLE:
      digitalWrite(PIN_RELAY, LOW);
      digitalWrite(PIN_LED_G, HIGH);     // Solid green
      digitalWrite(PIN_LED_R, LOW);
      break;

    case CHARGING:
      digitalWrite(PIN_RELAY, HIGH);     // Relay ON
      digitalWrite(PIN_LED_G, LOW);
      digitalWrite(PIN_LED_R, HIGH);     // Solid red
      break;
  }
}

// ── WebSocket event handler ───────────────────────────────────────────────────
void wsEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {

    case WStype_DISCONNECTED:
      Serial.println("[WS] ✗ Disconnected from server");
      wsConnected = false;
      state = OFFLINE;
      break;

    case WStype_CONNECTED:
      Serial.println("[WS] ✓ WebSocket connected — sending Socket.IO namespace connect");
      wsConnected = true;
      // Send Socket.IO namespace connect packet
      ws.sendTXT("40");
      break;

    case WStype_TEXT: {
      String msg = (char*)payload;
      Serial.printf("[WS] ← %s\n", msg.c_str());

      // Socket.IO PING (2) → reply with PONG (3) to stay connected
      if (msg == "2") {
        ws.sendTXT("3");
        sioPingReceived = true;
        break;
      }

      // Socket.IO namespace connected (40 or 40{}) → station is now AVAILABLE
      if (msg.startsWith("40")) {
        Serial.println("[Socket.IO] ✓ Namespace connected — Station AVAILABLE");
        state = AVAILABLE;

        // Flush any pending event that was queued before connection
        if (pendingEvent.length() > 0) {
          Serial.printf("[IoT] Flushing queued event: %s\n", pendingEvent.c_str());
          ws.sendTXT(pendingEvent);
          pendingEvent = "";
        }
        break;
      }

      // Socket.IO event (42[...]) → parse and sync state
      if (msg.startsWith("42")) {
        String json = msg.substring(2);   // strip the "42" prefix
        DynamicJsonDocument doc(512);
        if (deserializeJson(doc, json) != DeserializationError::Ok) break;

        const char* eventName = doc[0];
        if (!eventName) break;

        if (strcmp(eventName, "station_status_update") == 0) {
          const char* sid = doc[1]["stationId"];
          const char* sts = doc[1]["status"];
          if (sid && strcmp(sid, STATION_ID) == 0 && sts) {
            Serial.printf("[IoT] Station status synced → %s\n", sts);
            if      (strcmp(sts, "available") == 0) state = AVAILABLE;
            else if (strcmp(sts, "charging")  == 0) state = CHARGING;
            else                                    state = OFFLINE;
          }
        }
      }
      break;
    }

    default:
      break;
  }
}

// ── Setup ─────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=== EV Hub IoT Node Booting ===");

  // Init pins
  pinMode(PIN_RELAY, OUTPUT);
  pinMode(PIN_LED_G, OUTPUT);
  pinMode(PIN_LED_R, OUTPUT);
  pinMode(PIN_REED,  INPUT_PULLUP);

  // Safe startup state
  digitalWrite(PIN_RELAY, LOW);
  digitalWrite(PIN_LED_G, LOW);
  digitalWrite(PIN_LED_R, HIGH);   // Red on during boot

  // Connect to Wi-Fi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
  unsigned long wifiStart = millis();
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    if (millis() - wifiStart > 15000) {
      Serial.println("\n[WiFi] Timeout! Restarting...");
      ESP.restart();
    }
  }
  Serial.printf("\n[WiFi] ✓ Connected! IP: %s\n", WiFi.localIP().toString().c_str());
  digitalWrite(PIN_LED_R, LOW);   // Turn off boot indicator

  // Connect WebSocket to backend
  // setInsecure() skips CA cert validation — required for Wokwi simulator
  // and works fine since Render's TLS termination is still enforced at the host level.
  Serial.printf("[WS] Connecting to wss://%s:%d%s\n", SERVER_HOST, SERVER_PORT, SERVER_PATH);
  ws.beginSSL(SERVER_HOST, SERVER_PORT, SERVER_PATH);
  ws.setExtraHeaders("Origin: https://wokwi.com");   // Helps pass CORS on some servers
  ws.onEvent(wsEvent);
  ws.setReconnectInterval(3000);   // Retry every 3s if dropped
}

// ── Loop ──────────────────────────────────────────────────────────────────────
void loop() {
  ws.loop();
  setHardwareState();

  // Wi-Fi watchdog
  if (WiFi.status() != WL_CONNECTED) {
    state = OFFLINE;
    Serial.println("[WiFi] Lost! Reconnecting...");
    WiFi.reconnect();
    delay(1000);
    return;
  }

  // Read slide switch (wired: one end GND, other end GPIO 18 with INPUT_PULLUP)
  // Slide ON  → pin shorts to GND → reads LOW  → charger_plugged
  // Slide OFF → pin floats high   → reads HIGH → charger_unplugged
  int reading = digitalRead(PIN_REED);
  if (reading != lastSwitch) {
    lastDebounce = millis();
  }

  if ((millis() - lastDebounce) > DEBOUNCE_MS) {
    // LOW = switch closed = gun plugged in
    if (reading == LOW && !pluggedIn) {
      pluggedIn = true;
      Serial.println("[Switch] ▼ PLUGGED IN — emitting charger_plugged");
      emitEvent("charger_plugged", STATION_ID);
      state = CHARGING;
    }
    // HIGH = switch open = gun unplugged
    else if (reading == HIGH && pluggedIn) {
      pluggedIn = false;
      Serial.println("[Switch] ▲ UNPLUGGED — emitting charger_unplugged");
      emitEvent("charger_unplugged", STATION_ID);
      state = AVAILABLE;
    }
  }
  lastSwitch = reading;
}
