# Irie-Blocky

> **Next-Generation Visual Blockly Programming & Real-Time Circuit Simulation Workbench for Arduino, ESP32, STM32, and Raspberry Pi.**

IrieBlocky combines the ease of drag-and-drop block programming with a full-fledged electronic circuit simulation engine, professional IEEE schematic generator, live multi-channel waveform plotter, and interactive HUD multimeter probe — right in the browser with zero installation required.

---

## ⚡ Key Features

### 1. 🧩 Visual Blockly & Bidirectional C++ Studio
- **Dual-Engine Workspace**: Drag and drop Blockly visual blocks and watch standards-compliant Arduino C++ code generate in real time.
- **C++ to Blocks Parser**: Paste existing `.ino` / `.cpp` sketches and convert them back into visual blocks.
- **One-Click Export**: Download clean `.ino` files ready to upload with the official Arduino IDE.

### 2. 🔌 Authentic Wokwi Hardware Simulation (45+ Modules)
- **Microcontrollers**: Arduino Uno R3, Raspberry Pi Pico (RP2040), STM32 Blue Pill (STM32F103C8), ESP32-S2 Franzininho WiFi, STM32 Nucleo boards.
- **Sensors & Transducers**: BMP180 Barometric Pressure & Temperature (I2C GY-68), MFRC522 13.56 MHz RFID / NFC Reader, HC-SR04 Ultrasonic Sonar, DHT22 Temp & Humidity, PIR Motion, MQ-2 Gas, NTC Thermistor, DS18B20 1-Wire, DS1307 RTC, MPU6050 Gyro & Accel, HX711 Load Cell.
- **Outputs & Displays**: SSD1306 0.96" OLED (128x64), Grove SH1107 (128x128), HD44780 16x2 LCD, 5V Songle Relay Module, SG90 Micro Servo, WS2812B NeoPixel RGB Rings/Strips/Matrix, LEDs with EIA color-band resistors, Piezo Buzzers.
- **Interactive Component Panels**: MFRC522 RFID 6-card preset picker with UID customization, Tap / Hold switches, Resistor EIA 4-band multiplier calculator, and NeoPixel geometry configurator.

### 3. 📈 Real-Time Serial Plotter & Waveform Oscilloscope
- Multi-channel canvas oscilloscope living alongside the Serial Monitor terminal.
- Graphs analog sensor values and PWM duty cycles in real time with auto-scaling or fixed ranges (0–1023 ADC, 0–255 PWM).
- Includes crosshair hover inspector and one-click **CSV data export**.

### 4. ⚡ Interactive HUD Multimeter Probe
- Press **`M`** to activate live multimeter probe mode.
- Hover or click any terminal pin or wire during simulation to inspect:
  - Exact node voltage (V DC)
  - Estimated loop current (mA)
  - Logic states (HIGH, LOW, PWM duty %, ADC reading)
  - Overcurrent alerts if diodes or LEDs are unprotected.

### 5. 🛡️ Circuit Health & Smoke Prevention Diagnostics
- Live electrical linting that checks for:
  - Direct short circuits between 5V/3.3V and GND.
  - Burnt LEDs caused by missing current-limiting resistors.
  - Ungrounded digital ICs and modules.
- Educational diagnostic popup with plain-English explanations and recommended fixes.

### 6. 🔊 Tactile Sound Effects Engine (Web Audio API)
- Pure Web Audio synthesis with zero external dependencies:
  - Electromagnetic relay coil "click-clack" on switching.
  - Tactile spring switch clicks on pushbutton presses and releases.
  - Ascending dual-tone RFID scan chime on card presentation.
  - Tactile wire-connection snaps.

### 7. 📐 Standards-Compliant Schematic View & Bill of Materials (BOM)
- Dedicated **Schematic View** rendering IEEE/IEC vector schematics.
- Export as lossless SVG or printable engineering PDF.
- Categorized **Bill of Materials (BOM)** with reference designators (`U1`, `R1-R3`, `D1-D3`) and CSV export.

### 8. 〰️ Neat 90° Manhattan Wire Routing
- Orthogonal routing algorithm with rounded quadratic Bézier fillet curves.
- Zero-offset snapping to physical component terminal pinholes.

### 9. 🔍 Command Palette (`Ctrl+K` or `/`)
- Spotlight / Raycast-style command overlay to search and insert any part, trigger simulation actions, or launch starter projects in two keystrokes.

### 10. 🔄 2-Way Wokwi `diagram.json` Interoperability
- Export and import official Wokwi `diagram.json` schemas for seamless cross-platform workflow.
- **One-Click Academic Lab Report**: Generates formatted printable PDF reports with title, BOM table, and full source code.

---

## 🚀 Getting Started

No installation, build tools, or server required!

1. Clone or download this repository:
   ```bash
   git clone https://github.com/KingScorpio1/Irie-Blocky.git
   ```
2. Open `index.html` in Google Chrome, Edge, Firefox, or Safari:
   ```bash
   # On Windows
   start index.html
   ```
3. Choose an example project from the **📁 Examples** dropdown (e.g., *Traffic Light*, *RFID Card Reader*, *BMP180 Barometer*, *5V Relay*) and press **▶ Run** (or **F5**)!

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| **`F5`** / **`Ctrl + Enter`** | Run / Stop Virtual Arduino Simulation |
| **`Ctrl + K`** or **`/`** | Open Quick Command Palette |
| **`A`** | Open "Add Part" Component Catalog |
| **`M`** | Toggle Live Multimeter HUD Probe |
| **`R`** | Rotate Selected Component 90° Clockwise |
| **`D`** | Duplicate Selected Component |
| **`Delete`** / **`Backspace`** | Delete Selected Component or Wire |
| **`G`** | Toggle Coordinate Grid Overlay |
| **`+`** / **`-`** | Zoom In / Zoom Out Canvas |
| **`F`** | Fit Circuit to Window |
| **`0` – `9`, `C`, `L`, `M`, `Y` | Select Active Wire Color (Black, Red, Green, Blue, etc.) |

---

## 📜 License
MIT License &bull; Created with passion for STEM education, robotics clubs, and makers.
