# EV Hub — Figma Design System Specification

Use this document to build your Figma design. Values are directly extracted from the codebase.

---

## 1. Colors

### Backgrounds
| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-color` | `#080f1e` | Page background (deep navy) |
| `--bg-secondary` | `#0f1a2e` | Cards, sidebar, modal surfaces |
| `--bg-tertiary` | `#162035` | Inputs, badges, hover states |

### Text
| Token | Hex | Usage |
|-------|-----|-------|
| `--text-primary` | `#f0f6ff` | Headings, body text |
| `--text-secondary` | `#7c8fad` | Labels, subtitles, placeholders |

### Accent (Green Gradient)
| Token | Value | Usage |
|-------|-------|-------|
| `--accent-primary` | `#39ff14` | Neon green |
| `--accent-secondary` | `#00ffaa` | Teal green |
| Gradient | `135deg, #39ff14 → #00ffaa` | Primary buttons, active states, text gradients |

### OCPP Status Colors
| Status | Hex | Usage |
|--------|-----|-------|
| Available | `#10b981` | Green — station ready |
| Reserved | `#3b82f6` | Blue — slot booked |
| Charging | `#f59e0b` | Amber — in use |
| Offline | `#ef4444` | Red — disconnected |
| Fault | `#b91c1c` | Dark red — error |
| Locked | `#f97316` | Orange — solenoid engaged |

### Border & Glass
| Token | Value |
|-------|-------|
| `--border-color` | `rgba(255,255,255,0.07)` |
| `--glass-bg` | `rgba(15,26,46,0.75)` |
| `--glass-border` | `rgba(255,255,255,0.06)` |

---

## 2. Typography

- **Font Family:** `Inter` (Google Fonts)
- **Weights:** 300–900 (Regular 400, Medium 500, Semibold 600, Bold 700, ExtraBold 800)

### Size Scale (in Figma)
| Role | Size | Weight | Letter-Spacing |
|------|------|--------|----------------|
| H1 | 32px (2rem) | 800 | `-0.02em` |
| H2 | 28px (1.75rem) | 700 | — |
| H3 | 24px (1.5rem) | 700 | — |
| Section title | 20px (1.25rem) | 700 | — |
| Body | 15px (0.9375rem) | 400 | — |
| Small | 14px (0.875rem) | 400/600 | — |
| Caption | 13px (0.8125rem) | 400/700 | `+0.02em` |
| Tiny badge | 11px (0.7rem) | 500/700 | `+0.05em` uppercase |
| Line height | 1.55 (body) / 1.5 (UI) | | |

---

## 3. Spacing & Sizing

### Border Radius
| Token | Value |
|-------|-------|
| `--radius-sm` | 8px |
| `--radius-md` | 14px |
| `--radius-lg` | 22px |
| `--radius-full` | 9999px |

### Shadow
| Token | Value |
|-------|-------|
| `--shadow-sm` | `0 4px 6px -1px rgba(0,0,0,0.20)` |
| `--shadow-md` | `0 10px 20px -3px rgba(0,0,0,0.35)` |
| `--shadow-lg` | `0 24px 40px -5px rgba(0,0,0,0.50)` |

### Layout
| Element | Size |
|---------|------|
| Sidebar width | 260px |
| Navbar height | 68px (desktop), 60px (mobile) |
| Main padding | 32px (desktop), 16px (tablet), 12px (mobile) |

---

## 4. Components (for Figma)

### Glassmorphism Card
```
Background: rgba(15,26,46,0.75)
Backdrop blur: 16px
Border: 1px solid rgba(255,255,255,0.06)
Border-radius: 14px
Box-shadow: 0 10px 20px -3px rgba(0,0,0,0.35)
```

### Buttons

**Primary Button**
```
Background: Linear 135deg #39ff14 → #00ffaa
Text: #080f1e (dark)
Padding: 12px 24px
Border-radius: 8px
Font-weight: 700
Font-size: 15px
Box-shadow: 0 4px 18px rgba(57,255,20,0.35)
Hover: translateY(-2px), stronger shadow
Disabled: opacity 0.55
```

**Secondary Button**
```
Background: #162035
Text: #f0f6ff
Border: 1px solid rgba(255,255,255,0.07)
Border-radius: 8px
Padding: 12px 24px
Hover: border-color #39ff14, text #39ff14
```

**Danger Button**
```
Background: Linear 135deg #ef4444 → #dc2626
Text: white
Box-shadow: 0 4px 12px rgba(239,68,68,0.3)
```

### Status Badge
```
Padding: 4px 12px
Border-radius: 9999px
Font-size: 13px
Font-weight: 700
Gap: 6px (dot + text)
Dot: 7px circle, pulsing for "available"
```

Status background colors (+10% opacities):
- Available: bg `rgba(16,185,129,0.12)` / text `#10b981`
- Reserved: bg `rgba(59,130,246,0.12)` / text `#3b82f6`
- Charging: bg `rgba(245,158,11,0.12)` / text `#f59e0b`
- Offline: bg `rgba(239,68,68,0.12)` / text `#ef4444`
- Fault: bg `rgba(185,28,28,0.12)` / text `#b91c1c`
- Locked: bg `rgba(249,115,22,0.12)` / text `#f97316`

### Form Inputs
```
Background: #080f1e
Border: 1px solid rgba(255,255,255,0.07) → #39ff14 on focus
Border-radius: 8px
Padding: 12px 16px
Font-size: 15px
Color: #f0f6ff
Focus glow: 0 0 0 3px rgba(59,130,246,0.15)
```

### Input with Icon (used in Login/Signup)
```
Container: bg #162035, border 1px solid rgba(255,255,255,0.07), border-radius 14px, padding 0 16px
Icon: 18px, color #7c8fad (left)
Input: transparent bg, no border, flex: 1, color #f0f6ff
Padding: 14px vertical
```

### Stat Card
```
Background: glass (bg-secondary + blur)
Border-radius: 22px
Padding: 24px
Display: flex row, icon left, text right
Icon container: 48px, rounded 14px, colored gradient bg
Text: uppercase label (13px), value (28px bold), optional sub (12px)
Hover: translateY(-3px)
```

---

## 5. Icons

- **Library:** Lucide React (all icons used are from lucide-react)
- **Common icons used:** `Zap`, `Map`, `Clock`, `Calendar`, `User`, `Search`, `Bell`, `BatteryCharging`, `QrCode`, `Wifi`, `WifiOff`, `MapPin`, `Activity`, `CreditCard`, `PowerOff`, `X`, `Menu`, `ArrowRight`, `Mail`, `Lock`, `Phone`, `Car`, `Battery`, `IndianRupee`, `Plug`, `RefreshCw`, `Edit3`, `Save`, `Eye`, `EyeOff`, `Loader`, `LayoutDashboard`, `Shield`, `Radio`, `TrendingUp`, `ChevronRight`, `Play`, `Square`, `Timer`, `Bolt`, `History`, `CalendarIcon`, `AlertCircle`, `CheckCircle2`, `Camera`
- **Size:** 16–24px (18px default for inline, 20px for nav items, 24px for UI actions, 48px for brand logos)
- **Stroke width:** Default (2px)

---

## 6. Logo / Brand

```
Icon: Zap (lightning bolt)
Gradient: 135deg #39ff14 → #00ffaa
Container: 38x38px (sidebar), 48x48px (auth), rounded 10px
Box-shadow: 0 4px 12px rgba(59,130,246,0.4)
Text: "EV Hub" (Bold 800, 18px) + "BHUTAN NETWORK" (tiny uppercase)
```

---

## 7. Layout Structure (User App)

```
┌──────────┬──────────────────────────────────────┐
│ SIDEBAR  │           NAVBAR (68px)              │
│ 260px    ├──────────────────────────────────────┤
│          │                                      │
│ Logo     │        MAIN CONTENT                  │
│ Nav      │        (padding: 32px)               │
│ Items    │                                      │
│          │                                      │
│          │                                      │
│ Active   │                                      │
│ Session  │                                      │
│ Widget   │                                      │
│          │                                      │
└──────────┴──────────────────────────────────────┘
```

### Nav Items
| Icon | Label | Route |
|------|-------|-------|
| LayoutDashboard | Dashboard | `/` |
| Map | Stations Map | `/map` |
| Clock | Schedule | `/schedule` |
| Calendar | My Reservations | `/bookings` |
| User | Profile | `/profile` |

Bottom of sidebar: Logout button, Active Charging widget (if charging), Network status (AVAILABLE / OFFLINE badge).

---

## 8. Key Screen Layouts

### Dashboard
```
┌─ Stat Card ─┐ ┌─ Stat Card ─┐ ┌─ Stat Card ─┐ ┌─ Stat Card ─┐
│ Zap icon    │ │ Clock icon  │ │ Radio icon  │ │ Bolt icon   │
│ Stations    │ │ Available   │ │ Charging    │ │ Offline     │
│ 14          │ │ 8           │ │ 4           │ │ 2           │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘

┌─────────────── Active Charging Session ───────────────┐
│ Station: Thimphu Main  │  Status: ACTIVE (pulsing)    │
│ ┌────────────────────────────────────────────────────┐│
│ │ SoC: 56% (conic chart)  Power: 22.4kW  Duration   ││
│ │                          Energy: 3.2kWh  Cost: Nu48││
│ │                    [ STOP CHARGING ]               ││
│ └────────────────────────────────────────────────────┘│
└───────────────────────────────────────────────────────┘

┌── Station List ───────────────────────────────────────┐
│ Name     │ Status │ Address        │ Last Updated     │
│──────────┼────────┼────────────────┼──────────────────│
│ Thimphu  │ 🟢 Avail │ Clock Tower  │ Just now         │
│ Paro     │ 🟡 Charg  │ Airport Rd   │ 2m ago           │
└───────────────────────────────────────────────────────┘
```

### Login/Signup
```
┌───────────────────────────────────────────────────────────┐
│ ┌──────────────────┐  ┌─────────────────────────────────┐│
│ │   Left Panel      │  │   Right Panel                   ││
│ │   Gradient bg     │  │   bg-secondary                  ││
│ │                   │  │                                 ││
│ │   ⚡ EV Hub       │  │   Welcome Back                  ││
│ │   (floating logo) │  │   Sign in to access your        ││
│ │                   │  │   EV Hub dashboard.             ││
│ │   "Bhutan's       │  │   ┌─ Input ─────────────────┐  ││
│ │   premier EV      │  │   │ 📧 email@example.bt     │  ││
│ │   charging        │  │   └─────────────────────────┘  ││
│ │   network..."     │  │   ┌─ Input ─────────────────┐  ││
│ │                   │  │   │ 🔒 ••••••••            │  ││
│ │   50+   1.2K      │  │   └─────────────────────────┘  ││
│ │   Stns  Users     │  │   [ 🚀 Sign In ]              ││
│ └──────────────────┘  └─────────────────────────────────┘│
└───────────────────────────────────────────────────────────┘

Panel styles:
- Left: lg gradient 135deg #1e293b → #0f172a → #1a1040
- Right: bg #0f1a2e
- Together: 1000px max-width, 600px min-height, radius 22px
```

### Map Screen
```
┌───────────────────────────────────────────────────┐
│ [Full-height Leaflet map with custom dark tiles]  │
│                                                    │
│   📍 marker (available) → green glow pulse        │
│   📍 marker (charging)  → amber glow pulse        │
│   📍 marker (offline)   → red glow pulse          │
│   📍 marker (reserved)  → blue glow pulse         │
│   📍 marker (fault)     → purple glow             │
│                                                    │
│   Bottom-right: Legend                             │
│   🟢 Available  🔵 Reserved  🟡 Charging          │
│   🔴 Offline    🟣 Fault                          │
└───────────────────────────────────────────────────┘
```

Marker glow keyframes: pulse 0–50–100% with box-shadow growing then shrinking (5px → 20px → 5px).

### Schedule (Booking Grid)
```
┌── Date Selector ──────────────────────────────────────┐
│ [Mon] [Tue] [Wed] [Thu] [Fri] [Sat] [Sun] ← 7 days  │
└───────────────────────────────────────────────────────┘

┌── Station Row ────────────────────────────────────────┐
│ Name           │ 6a │ 7a │ 8a │ 9a │ 10a│ ...│ 11p  │
│ Thimphu Main   │ 🟢 │ 🟢 │ 🟢 │ 🔵 │ 🔵 │ 🟡 │ 🟢  │
│ Paro Airport   │ 🟢 │ 🟢 │ 🔴 │ 🔴 │ 🟢 │ 🟢 │ 🟢  │
│ Punakha Valley │ 🟢 │ 🟢 │ 🟢 │ 🟢 │ 🟢 │ 🟢 │ 🟡  │
└───────────────────────────────────────────────────────┘
Key: 🟢=Available  🔵=Reserved  🟡=Charging  🔴=Offline  ⚫=Past
```

### Profile Page
```
┌── Card ───────────────────────────────────────────────┐
│           [Edit Profile] button                       │
│   ┌──────────────────────────────────────┐            │
│   │  (Avatar circle, 72px, accent grad)  │            │
│   │  Karma Wangchuk                      │            │
│   │  🟢 EV Owner                         │            │
│   │                                      │            │
│   │  📧 karma@example.bt                 │            │
│   │  📞 +975 17 12 34 56                 │            │
│   │  🚗 Nissan Leaf                      │            │
│   └──────────────────────────────────────┘            │
│                                                        │
│   Stat: 12 Sessions   45.2 kWh    Nu 250 Wallet       │
└───────────────────────────────────────────────────────┘
```

### Booking Modal (2 Steps)
```
Step 1 — Reserve a Slot
┌── Modal (500px max) ──────────────────────────────────┐
│ [X]                                                    │
│ Reserve a Slot                                         │
│                                                        │
│ Select Connector: [ dropdown ▼ ]                       │
│ Select Date:    [ 📅 input ]  Time: [ dropdown ▼ ]    │
│ Duration: [ 30 min | 1 hr | 1.5 hr | 2 hr ]           │
│                                                        │
│        [Back]     [Proceed to Payment →]               │
└────────────────────────────────────────────────────────┘

Step 2 — Confirm Payment
┌── Modal ──────────────────────────────────────────────┐
│ [X]                                                    │
│ Confirm Payment                                        │
│                                                        │
│ ┌── Summary ──────────────────────────────────────┐   │
│ │ Station: Thimphu Main                           │   │
│ │ Date: 2026-05-25                                │   │
│ │ Time: 09:00 AM (30 mins)                        │   │
│ │ ─────────────────────────────────────           │   │
│ │ Reservation Fee:           Nu 50 (gradient)     │   │
│ └──────────────────────────────────────────────────┘   │
│                                                        │
│ Payment Method: [ B ] mBoB (Bank of Bhutan)            │
│                                                        │
│        [Back]              [Confirm Booking]           │
└────────────────────────────────────────────────────────┘
```

---

## 9. Animations (CSS → Figma Smart Animate)

| Name | Duration | Easing | Effect |
|------|----------|--------|--------|
| `fadeIn` | 0.4s | ease | Opacity 0→1, translateY 12→0 |
| `slideIn` | 0.35s | ease | Opacity 0→1, translateX 20→0 |
| `slideUp` | 0.3s | ease-out | translateY 100%→0 (mobile bottom sheet) |
| `pulse-dot` | 1s | ease-in-out infinite | Box-shadow glow on status dots |
| `marker-glow-*` | 2s | infinite | Box-shadow 5px→20px→5px (per color) |
| `livePulse` | 1.5s | ease-in-out infinite | Green live dot glow |
| `logo-float-glow` | 3s | ease-in-out infinite | translateY 0→-10, shadow glow |
| `spin` | 0.8s | linear infinite | Full rotation (loader) |
| `text-glow` | 3s | ease-in-out infinite | `drop-shadow` on EV Hub title |

---

## 10. Mobile Breakpoints (Figma Variants)

| Breakpoint | Changes |
|------------|---------|
| ≤768px (tablet) | Sidebar becomes off-canvas (overlay), search hidden, user info hidden, menu-toggle visible, auth card stacks vertically |
| ≤480px (phone) | Modals become bottom sheets (border-radius 24px top, full width), stat cards reduced padding, font sizes scale down (h1→24px, h2→19px) |
| ≤1024px | Dashboard grid collapses to single column |

---

## 11. Admin Panel (Tailwind 4 Theme)

### Colors
| Token | Hex |
|-------|-----|
| `--color-primary` | `#10b981` |
| `--color-secondary` | `#3b82f6` |
| `--color-bg-primary` | `#0f172a` |
| `--color-bg-secondary` | `#1e293b` |
| `--color-bg-tertiary` | `#334155` |
| `--color-border` | `#475569` |

### Admin Glass
```
Background: rgba(30,41,59,0.7)
Backdrop blur: 12px
Border: 1px solid rgba(255,255,255,0.1)
```

Admin gradient: `135deg, #10b981 → #3b82f6`

### Admin Pages
- `/` Dashboard (Recharts: bar, area, pie, line charts)
- `/chargers` CRUD station table
- `/ocpp` OCPP log viewer + status override
- `/users` User management table
- `/bookings` All bookings table
- `/schedule` Station schedule grid
- `/transactions` Transaction log
- `/analytics` Advanced Recharts dashboards
- `/faults` Fault monitoring
- `/remote` Remote station control
- `/simulation-control` Manual plug/unplug triggers
- `/notifications` System notifications CRUD
- `/settings` App configuration

### Recharts Colors (admin analytics)
- Green: `#10b981`
- Blue: `#3b82f6`
- Amber: `#f59e0b`
- Red: `#ef4444`
- Purple: `#8b5cf6`

---

## 12. Quick Actions Group

### Figma Asset Checklist

1. **Text Styles:** Create these named styles:
   - `H1 32px/800`, `H2 28px/700`, `H3 24px/700`, `Body 15px/400`, `Small 14px/400`, `Caption 13px/700`, `Tiny 11px/700 uppercase`

2. **Color Styles:** Create swatches for all colors in section 1

3. **Component Library:**
   - `Button/Primary`, `Button/Secondary`, `Button/Danger`
   - `Input/Default`, `Input/Focused`, `Input/with-icon`
   - `StatusBadge/{Available,Reserved,Charging,Offline,Fault,Locked}`
   - `StatCard`
   - `GlassCard`
   - `NavItem`
   - `Avatar`

4. **Maps:** Use Leaflet dark tiles color `#1a2744`. Marker components for each status.

5. **Frames for each page:**
   - Dashboard (1440×900)
   - Login/Signup (1000×600)
   - Map (1440×900)
   - Schedule (1440×900)
   - Bookings (1440×900)
   - Profile (900×800)
   - Mobile variants (375×812) for each screen

---

## Summary

This app uses a **dark theme** with:
- Deep navy backgrounds (`#080f1e`, `#0f1a2e`, `#162035`)
- Neon green accent gradient (`#39ff14` → `#00ffaa`)
- Glassmorphism cards (backdrop blur + semi-transparent bg)
- 6 OCPP status colors (green/blue/amber/red/dark-red/orange)
- Inter font with bold typography hierarchy
- Lucide React icons (2px stroke)
- Leaflet dark map with glowing markers per status
- Responsive: desktop → tablet (off-canvas sidebar) → mobile (bottom sheet modals)
