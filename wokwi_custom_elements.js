// js/wokwi_custom_elements.js — Authentic Web Components for Microcontrollers, Sensors & Modules
// Provides SVG visual rendering & pinInfo for parts not in @wokwi/elements bundle:
// - <wokwi-pi-pico> (Raspberry Pi Pico RP2040)
// - <board-franzininho-wifi> (ESP32-S2 Franzininho WiFi)
// - <board-bmp180> (BMP180 Barometric Pressure & Temperature Sensor)
// - <board-mfrc522> (MFRC522 13.56 MHz RFID / NFC Reader)
// - <wokwi-relay-module> (5V Songle 1-Channel Relay Module)
// - <board-grove-oled-sh1107> (Grove 128x128 Monochrome OLED Display)

(function () {
  if (typeof window === 'undefined' || typeof customElements === 'undefined') return;

  // =========================================================================
  // 1. Raspberry Pi Pico (<wokwi-pi-pico>)
  // =========================================================================
  class WokwiPiPico extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.pinInfo = this._initPinInfo();
    }

    connectedCallback() {
      this.render();
    }

    _initPinInfo() {
      const pins = [];
      // Left 20 pins (1 to 20): x = 6
      const leftNames = [
        'GP0', 'GP1', 'GND.1', 'GP2', 'GP3', 'GP4', 'GP5', 'GND.2',
        'GP6', 'GP7', 'GP8', 'GP9', 'GND.3', 'GP10', 'GP11', 'GP12',
        'GP13', 'GND.4', 'GP14', 'GP15'
      ];
      leftNames.forEach((name, i) => {
        const y = 28 + i * 10.5;
        pins.push({ name: name, x: 6, y: y, label: name });
        pins.push({ name: String(i + 1), x: 6, y: y, label: `Pin ${i + 1} (${name})` });
      });

      // Right 20 pins (40 down to 21): x = 94
      const rightNames = [
        'VBUS', 'VSYS', 'GND.5', '3V3_EN', '3V3', 'ADC_VREF', 'GP28', 'GND.6',
        'GP27', 'GP26', 'RUN', 'GP22', 'GND.7', 'GP21', 'GP20', 'GP19',
        'GP18', 'GND.8', 'GP17', 'GP16'
      ];
      rightNames.forEach((name, i) => {
        const y = 28 + i * 10.5;
        const pinNum = 40 - i;
        pins.push({ name: name, x: 94, y: y, label: name });
        pins.push({ name: String(pinNum), x: 94, y: y, label: `Pin ${pinNum} (${name})` });
      });

      return pins;
    }

    render() {
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: inline-block; width: 100px; height: 245px; user-select: none; }
          svg { width: 100%; height: 100%; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.18)); }
        </style>
        <svg viewBox="0 0 100 245" xmlns="http://www.w3.org/2000/svg">
          <!-- Green PCB -->
          <rect x="2" y="10" width="96" height="230" rx="6" fill="#0f7b44" stroke="#0a522d" stroke-width="1.2" />
          
          <!-- Micro-USB Jack -->
          <rect x="36" y="2" width="28" height="18" rx="2" fill="#d1d5db" stroke="#9ca3af" stroke-width="1" />
          <rect x="42" y="3" width="16" height="5" fill="#4b5563" />

          <!-- RP2040 Chip -->
          <rect x="34" y="95" width="32" height="32" rx="2" fill="#1e293b" stroke="#0f172a" stroke-width="1" />
          <!-- RP2040 Raspberry Pi Logo -->
          <circle cx="50" cy="111" r="7" fill="#dc2626" />
          <path d="M 47 107 Q 50 104 53 107 Q 50 114 47 107 Z" fill="#16a34a" />
          <text x="50" y="123" fill="#cbd5e1" font-size="4.5" font-family="ui-monospace, monospace" font-weight="700" text-anchor="middle">RP2040</text>

          <!-- BOOTSEL Button -->
          <rect x="42" y="55" width="16" height="12" rx="2" fill="#e2e8f0" stroke="#94a3b8" stroke-width="0.8" />
          <circle cx="50" cy="61" r="3.5" fill="#f8fafc" stroke="#cbd5e1" stroke-width="0.8" />
          <text x="50" y="73" fill="#ffffff" font-size="3.5" font-family="sans-serif" font-weight="700" text-anchor="middle">BOOTSEL</text>

          <!-- Crystal & Power Components -->
          <rect x="40" y="35" width="20" height="9" rx="1.5" fill="#cbd5e1" stroke="#94a3b8" stroke-width="0.6" />
          <text x="50" y="41" fill="#475569" font-size="3.5" font-family="sans-serif" text-anchor="middle">12.000</text>

          <!-- Silkscreen Text -->
          <text x="50" y="150" fill="#ffffff" font-size="5" font-family="sans-serif" font-weight="700" text-anchor="middle">Raspberry Pi Pico</text>
          <text x="50" y="157" fill="#a7f3d0" font-size="3.5" font-family="sans-serif" text-anchor="middle">2020</text>

          <!-- Debug Pads on Bottom -->
          <circle cx="43" cy="230" r="1.8" fill="#d97706" />
          <circle cx="50" cy="230" r="1.8" fill="#d97706" />
          <circle cx="57" cy="230" r="1.8" fill="#d97706" />
          <text x="50" y="225" fill="#ffffff" font-size="3" font-family="sans-serif" text-anchor="middle">DEBUG</text>

          <!-- Castellated Pin Pads (Left) -->
          ${Array.from({ length: 20 }).map((_, i) => {
            const y = 28 + i * 10.5;
            return `
              <rect x="3" y="${y - 3.5}" width="7" height="7" rx="1.5" fill="#f59e0b" stroke="#b45309" stroke-width="0.6" />
              <circle cx="6" cy="${y}" r="2" fill="#1e293b" />
            `;
          }).join('')}

          <!-- Castellated Pin Pads (Right) -->
          ${Array.from({ length: 20 }).map((_, i) => {
            const y = 28 + i * 10.5;
            return `
              <rect x="90" y="${y - 3.5}" width="7" height="7" rx="1.5" fill="#f59e0b" stroke="#b45309" stroke-width="0.6" />
              <circle cx="94" cy="${y}" r="2" fill="#1e293b" />
            `;
          }).join('')}
        </svg>
      `;
    }
  }

  // =========================================================================
  // 2. ESP32 Franzininho WiFi (<board-franzininho-wifi>)
  // =========================================================================
  class BoardFranzininhoWifi extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.led33 = false;
      this.led21 = false;
      this.pinInfo = this._initPinInfo();
    }

    connectedCallback() {
      this.render();
    }

    setLed(pin, state) {
      if (pin === 33) this.led33 = !!state;
      if (pin === 21) this.led21 = !!state;
      this.render();
    }

    _initPinInfo() {
      const pins = [];
      const leftPins = ['3V3', 'IO1', 'IO2', 'IO3', 'IO4', 'IO5', 'IO6', 'IO7', 'IO8', 'IO9', 'IO10', 'IO11', 'IO12', 'IO13', 'IO14', 'GND.1'];
      leftPins.forEach((name, i) => {
        pins.push({ name: name, x: 8, y: 35 + i * 12, label: name });
      });

      const rightPins = ['5V', 'GND.2', 'IO15', 'IO16', 'IO17', 'IO18', 'IO19', 'IO20', 'IO21', 'IO33', 'IO34', 'IO35', 'IO36', 'IO37', 'TX', 'RX'];
      rightPins.forEach((name, i) => {
        pins.push({ name: name, x: 104, y: 35 + i * 12, label: name });
      });

      return pins;
    }

    render() {
      const orangeGlow = this.led33 ? 'fill="#ff8800" filter="url(#glowOrange)"' : 'fill="#7c2d12"';
      const blueGlow = this.led21 ? 'fill="#38bdf8" filter="url(#glowBlue)"' : 'fill="#1e3a8a"';

      this.shadowRoot.innerHTML = `
        <style>
          :host { display: inline-block; width: 112px; height: 235px; user-select: none; }
          svg { width: 100%; height: 100%; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.22)); }
        </style>
        <svg viewBox="0 0 112 235" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="glowOrange" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#f97316" />
            </filter>
            <filter id="glowBlue" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#38bdf8" />
            </filter>
          </defs>

          <!-- Matte Black PCB -->
          <rect x="2" y="10" width="108" height="220" rx="6" fill="#18181b" stroke="#27272a" stroke-width="1.2" />

          <!-- USB-C Port at Top -->
          <rect x="42" y="2" width="28" height="15" rx="3" fill="#94a3b8" stroke="#64748b" stroke-width="1" />
          <rect x="48" y="4" width="16" height="5" rx="1.5" fill="#334155" />

          <!-- ESP32-S2 Module Shield -->
          <rect x="24" y="32" width="64" height="75" rx="2" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1" />
          <!-- PCB Antenna -->
          <path d="M 28 36 L 84 36 L 84 48 L 76 48 L 76 40 L 68 40 L 68 48 L 60 48 L 60 40 L 52 40 L 52 48 L 44 48 L 44 40 L 36 40 L 36 48 L 28 48 Z" fill="#b45309" />
          <text x="56" y="70" fill="#1e293b" font-size="6.5" font-family="sans-serif" font-weight="800" text-anchor="middle">ESP32-S2</text>
          <text x="56" y="80" fill="#475569" font-size="4" font-family="sans-serif" text-anchor="middle">Franzininho WiFi</text>

          <!-- Built-in LEDs -->
          <!-- Power LED (Green) -->
          <circle cx="34" cy="120" r="3" fill="#22c55e" />
          <text x="34" y="128" fill="#a1a1aa" font-size="3.2" font-family="sans-serif" text-anchor="middle">PWR</text>

          <!-- LED 33 (Orange) -->
          <circle cx="56" cy="120" r="3" ${orangeGlow} />
          <text x="56" y="128" fill="#a1a1aa" font-size="3.2" font-family="sans-serif" text-anchor="middle">IO33</text>

          <!-- LED 21 (Blue) -->
          <circle cx="78" cy="120" r="3" ${blueGlow} />
          <text x="78" y="128" fill="#a1a1aa" font-size="3.2" font-family="sans-serif" text-anchor="middle">IO21</text>

          <!-- Reset and Boot Buttons -->
          <rect x="30" y="140" width="16" height="12" rx="2" fill="#3f3f46" stroke="#71717a" stroke-width="0.8" />
          <circle cx="38" cy="146" r="3" fill="#e4e4e7" />
          <text x="38" y="158" fill="#a1a1aa" font-size="3.5" font-family="sans-serif" text-anchor="middle">RST</text>

          <rect x="66" y="140" width="16" height="12" rx="2" fill="#3f3f46" stroke="#71717a" stroke-width="0.8" />
          <circle cx="74" cy="146" r="3" fill="#e4e4e7" />
          <text x="74" y="158" fill="#a1a1aa" font-size="3.5" font-family="sans-serif" text-anchor="middle">BOOT</text>

          <!-- Silkscreen Brazilian Flag Icon & Text -->
          <text x="56" y="185" fill="#facc15" font-size="5" font-family="sans-serif" font-weight="700" text-anchor="middle">FRANZININHO</text>
          <text x="56" y="193" fill="#22c55e" font-size="4" font-family="sans-serif" text-anchor="middle">Open Hardware</text>

          <!-- Headers Left (16 pins) -->
          ${Array.from({ length: 16 }).map((_, i) => {
            const y = 35 + i * 12;
            return `
              <circle cx="8" cy="${y}" r="3.2" fill="#f59e0b" stroke="#78350f" stroke-width="0.8" />
              <circle cx="8" cy="${y}" r="1.6" fill="#09090b" />
            `;
          }).join('')}

          <!-- Headers Right (16 pins) -->
          ${Array.from({ length: 16 }).map((_, i) => {
            const y = 35 + i * 12;
            return `
              <circle cx="104" cy="${y}" r="3.2" fill="#f59e0b" stroke="#78350f" stroke-width="0.8" />
              <circle cx="104" cy="${y}" r="1.6" fill="#09090b" />
            `;
          }).join('')}
        </svg>
      `;
    }
  }

  // =========================================================================
  // 3. BMP180 Barometric Pressure & Temperature Sensor (<board-bmp180>)
  // =========================================================================
  class BoardBmp180 extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.temperature = 24.0;
      this.pressure = 101325;
      this.pinInfo = [
        { name: 'VCC', x: 10, y: 64, label: 'VCC (3.3V - 5V)' },
        { name: '3.3V', x: 22.5, y: 64, label: '3.3V Supply' },
        { name: 'GND', x: 35, y: 64, label: 'Ground' },
        { name: 'SCL', x: 47.5, y: 64, label: 'I2C Clock' },
        { name: 'SDA', x: 60, y: 64, label: 'I2C Data' }
      ];
    }

    connectedCallback() {
      this.render();
    }

    render() {
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: inline-block; width: 70px; height: 75px; user-select: none; cursor: pointer; }
          svg { width: 100%; height: 100%; filter: drop-shadow(0 3px 8px rgba(0,0,0,0.16)); }
        </style>
        <svg viewBox="0 0 70 75" xmlns="http://www.w3.org/2000/svg">
          <!-- Blue PCB -->
          <rect x="2" y="2" width="66" height="70" rx="5" fill="#1d4ed8" stroke="#1e40af" stroke-width="1.2" />

          <!-- Silver BMP180 Metal Sensor Can -->
          <rect x="23" y="16" width="24" height="24" rx="3" fill="#cbd5e1" stroke="#64748b" stroke-width="1.2" />
          <!-- Pressure Hole -->
          <circle cx="35" cy="28" r="2.5" fill="#0f172a" />
          <text x="35" y="23" fill="#334155" font-size="3.5" font-family="sans-serif" font-weight="800" text-anchor="middle">BMP180</text>

          <!-- SMD Components -->
          <rect x="10" y="18" width="6" height="4" fill="#1e293b" />
          <rect x="10" y="26" width="6" height="4" fill="#1e293b" />
          <rect x="54" y="20" width="8" height="10" rx="1" fill="#0f172a" />

          <!-- Silkscreen Text -->
          <text x="35" y="10" fill="#ffffff" font-size="4.8" font-family="sans-serif" font-weight="700" text-anchor="middle">GY-68</text>
          
          <!-- Pin Labels -->
          <text x="10" y="52" fill="#ffffff" font-size="3" font-family="sans-serif" font-weight="600" text-anchor="middle">VCC</text>
          <text x="22.5" y="52" fill="#ffffff" font-size="3" font-family="sans-serif" font-weight="600" text-anchor="middle">3.3</text>
          <text x="35" y="52" fill="#ffffff" font-size="3" font-family="sans-serif" font-weight="600" text-anchor="middle">GND</text>
          <text x="47.5" y="52" fill="#ffffff" font-size="3" font-family="sans-serif" font-weight="600" text-anchor="middle">SCL</text>
          <text x="60" y="52" fill="#ffffff" font-size="3" font-family="sans-serif" font-weight="600" text-anchor="middle">SDA</text>

          <!-- Gold Plated Header Pins -->
          <circle cx="10" cy="64" r="3" fill="#f59e0b" stroke="#78350f" stroke-width="0.8" />
          <circle cx="10" cy="64" r="1.4" fill="#0f172a" />

          <circle cx="22.5" cy="64" r="3" fill="#f59e0b" stroke="#78350f" stroke-width="0.8" />
          <circle cx="22.5" cy="64" r="1.4" fill="#0f172a" />

          <circle cx="35" cy="64" r="3" fill="#f59e0b" stroke="#78350f" stroke-width="0.8" />
          <circle cx="35" cy="64" r="1.4" fill="#0f172a" />

          <circle cx="47.5" cy="64" r="3" fill="#f59e0b" stroke="#78350f" stroke-width="0.8" />
          <circle cx="47.5" cy="64" r="1.4" fill="#0f172a" />

          <circle cx="60" cy="64" r="3" fill="#f59e0b" stroke="#78350f" stroke-width="0.8" />
          <circle cx="60" cy="64" r="1.4" fill="#0f172a" />
        </svg>
      `;
    }
  }

  // =========================================================================
  // 4. MFRC522 RFID / NFC Reader (<board-mfrc522>)
  // =========================================================================
  class BoardMfrc522 extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._uid = '01:02:03:04';
      this._tagPresent = false;
      this._cardIndex = 0;
      this.pinInfo = [
        { name: '3.3V', x: 18, y: 154, label: '3.3V Supply Only' },
        { name: 'RST', x: 31, y: 154, label: 'Reset (Uno 9)' },
        { name: 'GND', x: 44, y: 154, label: 'Ground' },
        { name: 'IRQ', x: 57, y: 154, label: 'Interrupt' },
        { name: 'MISO', x: 70, y: 154, label: 'SPI MISO (Uno 12)' },
        { name: 'MOSI', x: 83, y: 154, label: 'SPI MOSI (Uno 11)' },
        { name: 'SCK', x: 96, y: 154, label: 'SPI SCK (Uno 13)' },
        { name: 'SDA', x: 109, y: 154, label: 'SPI SS (Uno 10)' }
      ];
    }

    get tagPresent() { return this._tagPresent ? 1 : 0; }
    set tagPresent(v) {
      this._tagPresent = !!v;
      this.render();
    }

    get card() { return this._cardIndex; }
    set card(v) {
      this._cardIndex = Math.max(0, Math.min(5, parseInt(v, 10) || 0));
      this.render();
    }

    get uid() { return this.getAttribute('uid') || this._uid; }
    set uid(v) {
      this._uid = v;
      this.setAttribute('uid', v);
      this.render();
    }

    connectedCallback() {
      this.render();
    }

    render() {
      const customBlueUid = this.getAttribute('uid') || this._uid || '01:02:03:04';
      const presets = [
        { name: 'Blue Card', color: '#2563eb', stroke: '#1d4ed8', uid: customBlueUid, type: 'MIFARE 1K', shape: 'card' },
        { name: 'Green Card', color: '#16a34a', stroke: '#15803d', uid: '11:22:33:44', type: 'MIFARE 1K', shape: 'card' },
        { name: 'Yellow Card', color: '#eab308', stroke: '#ca8a04', uid: '55:66:77:88', type: 'MIFARE 1K', shape: 'card' },
        { name: 'Red Card', color: '#dc2626', stroke: '#b91c1c', uid: 'AA:BB:CC:DD', type: 'MIFARE 1K', shape: 'card' },
        { name: 'NFC Tag', color: '#64748b', stroke: '#475569', uid: '04:11:22:33:44:55:66', type: 'Ultralight', shape: 'disc' },
        { name: 'Key Fob', color: '#ea580c', stroke: '#c2410c', uid: 'C0:FF:EE:99', type: 'Mini', shape: 'fob' }
      ];

      const activeCard = presets[this._cardIndex || 0] || presets[0];

      const presentedCardMarkup = this._tagPresent ? `
        <!-- Floating Active Card Over Antenna -->
        <g id="presentedCardGraphic">
          ${activeCard.shape === 'card' ? `
            <rect x="8" y="16" width="110" height="72" rx="4" fill="${activeCard.color}" stroke="#ffffff" stroke-width="1.5" />
            <rect x="14" y="22" width="16" height="12" rx="2" fill="#fbbf24" stroke="#d97706" stroke-width="0.8" />
            <circle cx="98" cy="28" r="7" fill="none" stroke="#ffffff" stroke-width="1.2" />
            <text x="63" y="60" fill="#ffffff" font-size="6.8" font-family="monospace" font-weight="700" text-anchor="middle">${activeCard.uid}</text>
            <text x="63" y="74" fill="#ffffff" opacity="0.9" font-size="4.2" font-family="sans-serif" font-weight="600" text-anchor="middle">${activeCard.name}</text>
          ` : (activeCard.shape === 'disc' ? `
            <circle cx="63" cy="51" r="32" fill="${activeCard.color}" stroke="#ffffff" stroke-width="1.6" />
            <circle cx="63" cy="51" r="14" fill="#0f172a" opacity="0.25" />
            <text x="63" y="48" fill="#ffffff" font-size="4.2" font-family="monospace" font-weight="700" text-anchor="middle">${activeCard.uid.slice(0, 11)}</text>
            <text x="63" y="56" fill="#ffffff" font-size="4.2" font-family="monospace" font-weight="700" text-anchor="middle">${activeCard.uid.slice(12)}</text>
            <text x="63" y="68" fill="#ffffff" opacity="0.9" font-size="3.6" font-family="sans-serif" font-weight="600" text-anchor="middle">NFC Tag (Ultralight)</text>
          ` : `
            <circle cx="63" cy="51" r="29" fill="${activeCard.color}" stroke="#ffffff" stroke-width="1.6" />
            <circle cx="63" cy="27" r="4" fill="#1e293b" stroke="#ffffff" stroke-width="1.2" />
            <text x="63" y="53" fill="#ffffff" font-size="5.8" font-family="monospace" font-weight="700" text-anchor="middle">${activeCard.uid}</text>
            <text x="63" y="66" fill="#ffffff" opacity="0.9" font-size="4.2" font-family="sans-serif" font-weight="600" text-anchor="middle">Key Fob (Mini)</text>
          `)}
        </g>
      ` : '';

      this.shadowRoot.innerHTML = `
        <style>
          :host { display: inline-block; width: 126px; height: 165px; user-select: none; cursor: pointer; }
          svg { width: 100%; height: 100%; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.2)); }
        </style>
        <svg viewBox="0 0 126 165" xmlns="http://www.w3.org/2000/svg">
          <!-- Blue PCB Base -->
          <rect x="2" y="2" width="122" height="160" rx="6" fill="#1e40af" stroke="#1d4ed8" stroke-width="1.4" />

          <!-- 4 Mounting Holes -->
          <circle cx="8" cy="8" r="3" fill="#1e293b" stroke="#94a3b8" stroke-width="0.8" />
          <circle cx="118" cy="8" r="3" fill="#1e293b" stroke="#94a3b8" stroke-width="0.8" />
          <circle cx="8" cy="156" r="3" fill="#1e293b" stroke="#94a3b8" stroke-width="0.8" />
          <circle cx="118" cy="156" r="3" fill="#1e293b" stroke="#94a3b8" stroke-width="0.8" />

          <!-- Concentric RFID Trace Antenna (Gold Coil Pattern) -->
          <rect x="12" y="14" width="102" height="74" rx="6" fill="none" stroke="#f59e0b" stroke-width="1.2" />
          <rect x="16" y="18" width="94" height="66" rx="5" fill="none" stroke="#f59e0b" stroke-width="1.2" />
          <rect x="20" y="22" width="86" height="58" rx="4" fill="none" stroke="#f59e0b" stroke-width="1.2" />
          <rect x="24" y="26" width="78" height="50" rx="3" fill="none" stroke="#f59e0b" stroke-width="1.2" />

          <!-- Antenna Silkscreen NFC Icon -->
          <circle cx="63" cy="51" r="14" fill="rgba(245, 158, 11, 0.15)" stroke="#f59e0b" stroke-width="1" />
          <path d="M 57 51 A 6 6 0 0 1 69 51 M 54 51 A 9 9 0 0 1 72 51 M 51 51 A 12 12 0 0 1 75 51" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" />

          <!-- Presented Card Layer (if tagPresent is true) -->
          ${presentedCardMarkup}

          <!-- NXP MFRC522 Chip in Middle -->
          <rect x="51" y="96" width="24" height="24" rx="2" fill="#0f172a" stroke="#334155" stroke-width="1" />
          <text x="63" y="108" fill="#e2e8f0" font-size="3.8" font-family="sans-serif" font-weight="800" text-anchor="middle">MFRC522</text>
          <circle cx="55" cy="100" r="1" fill="#f8fafc" />

          <!-- 27.120 MHz Crystal Can -->
          <rect x="24" y="102" width="16" height="8" rx="1.5" fill="#cbd5e1" stroke="#64748b" stroke-width="0.8" />
          <text x="32" y="107.5" fill="#334155" font-size="3" font-family="sans-serif" text-anchor="middle">27.120</text>

          <!-- Power LED -->
          <circle cx="95" cy="106" r="2.5" fill="#ef4444" />
          <text x="95" y="114" fill="#cbd5e1" font-size="3" font-family="sans-serif" text-anchor="middle">PWR</text>

          <!-- Silkscreen Title -->
          <text x="63" y="132" fill="#ffffff" font-size="5.5" font-family="sans-serif" font-weight="700" text-anchor="middle">RFID-RC522</text>

          <!-- 8 Pin Labels -->
          <text x="18" y="145" fill="#ffffff" font-size="2.8" font-family="sans-serif" text-anchor="middle">3.3V</text>
          <text x="31" y="145" fill="#ffffff" font-size="2.8" font-family="sans-serif" text-anchor="middle">RST</text>
          <text x="44" y="145" fill="#ffffff" font-size="2.8" font-family="sans-serif" text-anchor="middle">GND</text>
          <text x="57" y="145" fill="#ffffff" font-size="2.8" font-family="sans-serif" text-anchor="middle">IRQ</text>
          <text x="70" y="145" fill="#ffffff" font-size="2.8" font-family="sans-serif" text-anchor="middle">MISO</text>
          <text x="83" y="145" fill="#ffffff" font-size="2.8" font-family="sans-serif" text-anchor="middle">MOSI</text>
          <text x="96" y="145" fill="#ffffff" font-size="2.8" font-family="sans-serif" text-anchor="middle">SCK</text>
          <text x="109" y="145" fill="#ffffff" font-size="2.8" font-family="sans-serif" text-anchor="middle">SDA</text>

          <!-- 8 Header Pins -->
          ${[18, 31, 44, 57, 70, 83, 96, 109].map(x => `
            <circle cx="${x}" cy="154" r="3" fill="#f59e0b" stroke="#78350f" stroke-width="0.8" />
            <circle cx="${x}" cy="154" r="1.4" fill="#0f172a" />
          `).join('')}
        </svg>
      `;
    }
  }

  // =========================================================================
  // 5. Songle 5V Relay Module (<wokwi-relay-module>)
  // =========================================================================
  class WokwiRelayModule extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._value = false;
      this.pinInfo = [
        // Left screw terminals
        { name: 'NO', x: 12, y: 22, label: 'Normally Open' },
        { name: 'COM', x: 12, y: 46, label: 'Common Terminal' },
        { name: 'NC', x: 12, y: 70, label: 'Normally Closed' },
        // Right header pins
        { name: 'VCC', x: 108, y: 26, label: 'VCC (5V)' },
        { name: 'IN', x: 108, y: 46, label: 'Relay Control Signal' },
        { name: 'GND', x: 108, y: 66, label: 'Ground' }
      ];
    }

    get value() { return this._value; }
    set value(v) {
      this._value = !!v;
      this.render();
    }

    connectedCallback() {
      this.render();
    }

    render() {
      const stateLedColor = this._value ? '#22c55e' : '#14532d';
      const stateGlow = this._value ? 'filter="url(#relayGlow)"' : '';

      this.shadowRoot.innerHTML = `
        <style>
          :host { display: inline-block; width: 120px; height: 92px; user-select: none; }
          svg { width: 100%; height: 100%; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.2)); }
        </style>
        <svg viewBox="0 0 120 92" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="relayGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#22c55e" />
            </filter>
          </defs>

          <!-- Blue PCB Base -->
          <rect x="2" y="2" width="116" height="88" rx="5" fill="#1e3a8a" stroke="#172554" stroke-width="1.2" />

          <!-- 4 Mounting Holes -->
          <circle cx="7" cy="7" r="2.5" fill="#0f172a" />
          <circle cx="113" cy="7" r="2.5" fill="#0f172a" />
          <circle cx="7" cy="85" r="2.5" fill="#0f172a" />
          <circle cx="113" cy="85" r="2.5" fill="#0f172a" />

          <!-- Green 3-Terminal Screw Block on Left -->
          <rect x="5" y="12" width="18" height="68" rx="2" fill="#15803d" stroke="#166534" stroke-width="1" />
          <!-- Screws -->
          <circle cx="12" cy="22" r="4" fill="#cbd5e1" stroke="#475569" stroke-width="0.8" />
          <line x1="9" y1="22" x2="15" y2="22" stroke="#475569" stroke-width="1.2" />
          
          <circle cx="12" cy="46" r="4" fill="#cbd5e1" stroke="#475569" stroke-width="0.8" />
          <line x1="9" y1="46" x2="15" y2="46" stroke="#475569" stroke-width="1.2" />

          <circle cx="12" cy="70" r="4" fill="#cbd5e1" stroke="#475569" stroke-width="0.8" />
          <line x1="9" y1="70" x2="15" y2="70" stroke="#475569" stroke-width="1.2" />

          <text x="27" y="24" fill="#ffffff" font-size="3.5" font-family="sans-serif">NO</text>
          <text x="27" y="48" fill="#ffffff" font-size="3.5" font-family="sans-serif">COM</text>
          <text x="27" y="72" fill="#ffffff" font-size="3.5" font-family="sans-serif">NC</text>

          <!-- Blue Songle Sugar Cube Relay Box -->
          <rect x="38" y="16" width="56" height="58" rx="3" fill="#0284c7" stroke="#0369a1" stroke-width="1.4" />
          <text x="66" y="30" fill="#ffffff" font-size="5.5" font-family="sans-serif" font-weight="800" text-anchor="middle">SONGLE</text>
          <text x="66" y="40" fill="#ffffff" font-size="3.6" font-family="sans-serif" font-weight="600" text-anchor="middle">SRD-05VDC-SL-C</text>
          <text x="66" y="50" fill="#e0f2fe" font-size="3.2" font-family="sans-serif" text-anchor="middle">10A 250VAC \u2022 10A 30VDC</text>
          <text x="66" y="62" fill="#fef08a" font-size="3.5" font-family="sans-serif" font-weight="700" text-anchor="middle">5V RELAY</text>

          <!-- Status Indicators -->
          <!-- Power LED (Red) -->
          <circle cx="101" cy="76" r="2.2" fill="#ef4444" />
          <text x="101" y="84" fill="#cbd5e1" font-size="2.8" font-family="sans-serif" text-anchor="middle">PWR</text>

          <!-- Relay Activated LED (Green) -->
          <circle cx="101" cy="14" r="2.5" fill="${stateLedColor}" ${stateGlow} />
          <text x="101" y="22" fill="#cbd5e1" font-size="2.8" font-family="sans-serif" text-anchor="middle">D1</text>

          <!-- Right 3-Pin Header (VCC, IN, GND) -->
          <circle cx="108" cy="26" r="3" fill="#f59e0b" stroke="#78350f" stroke-width="0.8" />
          <circle cx="108" cy="26" r="1.4" fill="#0f172a" />
          <text x="101" y="28" fill="#ffffff" font-size="3" font-family="sans-serif" text-anchor="end">VCC</text>

          <circle cx="108" cy="46" r="3" fill="#f59e0b" stroke="#78350f" stroke-width="0.8" />
          <circle cx="108" cy="46" r="1.4" fill="#0f172a" />
          <text x="101" y="48" fill="#ffffff" font-size="3" font-family="sans-serif" text-anchor="end">IN</text>

          <circle cx="108" cy="66" r="3" fill="#f59e0b" stroke="#78350f" stroke-width="0.8" />
          <circle cx="108" cy="66" r="1.4" fill="#0f172a" />
          <text x="101" y="68" fill="#ffffff" font-size="3" font-family="sans-serif" text-anchor="end">GND</text>
        </svg>
      `;
    }
  }

  // =========================================================================
  // 6. Grove OLED Display 128x128 (<board-grove-oled-sh1107>)
  // =========================================================================
  class BoardGroveOledSh1107 extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.pinInfo = [
        { name: 'SCL', x: 30, y: 104, label: 'I2C SCL' },
        { name: 'SDA', x: 46, y: 104, label: 'I2C SDA' },
        { name: 'VCC', x: 62, y: 104, label: 'VCC (3.3V - 5V)' },
        { name: 'GND', x: 78, y: 104, label: 'Ground' }
      ];
    }

    connectedCallback() {
      this.render();
    }

    render() {
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: inline-block; width: 110px; height: 115px; user-select: none; }
          svg { width: 100%; height: 100%; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.2)); }
        </style>
        <svg viewBox="0 0 110 115" xmlns="http://www.w3.org/2000/svg">
          <!-- Grove PCB -->
          <rect x="2" y="2" width="106" height="108" rx="6" fill="#0f172a" stroke="#334155" stroke-width="1.2" />
          
          <!-- OLED Glass Display 128x128 -->
          <rect x="15" y="10" width="80" height="75" rx="3" fill="#020617" stroke="#38bdf8" stroke-width="1.2" />
          <rect x="18" y="13" width="74" height="69" fill="#030712" />

          <!-- Pixel Grid Simulation -->
          <text x="55" y="38" fill="#38bdf8" font-size="6.5" font-family="monospace" font-weight="700" text-anchor="middle">SH1107</text>
          <text x="55" y="48" fill="#e0f2fe" font-size="4.5" font-family="monospace" text-anchor="middle">128x128 OLED</text>
          <text x="55" y="60" fill="#94a3b8" font-size="4" font-family="monospace" text-anchor="middle">I2C: 0x3C</text>

          <!-- Grove Yellow Connector at Bottom -->
          <rect x="22" y="94" width="66" height="18" rx="2" fill="#facc15" stroke="#ca8a04" stroke-width="1" />
          
          <!-- 4 Grove Pins -->
          <circle cx="30" cy="104" r="2.5" fill="#1e293b" />
          <circle cx="46" cy="104" r="2.5" fill="#1e293b" />
          <circle cx="62" cy="104" r="2.5" fill="#1e293b" />
          <circle cx="78" cy="104" r="2.5" fill="#1e293b" />

          <text x="30" y="91" fill="#cbd5e1" font-size="3" font-family="sans-serif" text-anchor="middle">SCL</text>
          <text x="46" y="91" fill="#cbd5e1" font-size="3" font-family="sans-serif" text-anchor="middle">SDA</text>
          <text x="62" y="91" fill="#cbd5e1" font-size="3" font-family="sans-serif" text-anchor="middle">VCC</text>
          <text x="78" y="91" fill="#cbd5e1" font-size="3" font-family="sans-serif" text-anchor="middle">GND</text>
        </svg>
      `;
    }
  }

  // =========================================================================
  // 7. SSD1306 128x64 Monochrome OLED Display (<board-ssd1306>, <wokwi-ssd1306>)
  // =========================================================================
  class BoardSsd1306 extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.i2cAddress = '0x3c';
      this.pinInfo = [
        { name: 'GND', x: 25, y: 12, label: 'Ground' },
        { name: 'VCC', x: 43, y: 12, label: 'VCC (3.3V - 5V)' },
        { name: 'SCL', x: 61, y: 12, label: 'I2C SCL' },
        { name: 'SDA', x: 79, y: 12, label: 'I2C SDA' }
      ];
    }

    connectedCallback() {
      this.render();
    }

    render() {
      const addr = this.getAttribute('i2cAddress') || this.i2cAddress || '0x3c';
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: inline-block; width: 104px; height: 110px; user-select: none; }
          svg { width: 100%; height: 100%; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.22)); }
        </style>
        <svg viewBox="0 0 104 110" xmlns="http://www.w3.org/2000/svg">
          <!-- Blue PCB -->
          <rect x="2" y="2" width="100" height="106" rx="5" fill="#1e3a8a" stroke="#1d4ed8" stroke-width="1.2" />

          <!-- 4 Mounting Holes -->
          <circle cx="7" cy="7" r="2.5" fill="#0f172a" stroke="#64748b" stroke-width="0.7" />
          <circle cx="97" cy="7" r="2.5" fill="#0f172a" stroke="#64748b" stroke-width="0.7" />
          <circle cx="7" cy="103" r="2.5" fill="#0f172a" stroke="#64748b" stroke-width="0.7" />
          <circle cx="97" cy="103" r="2.5" fill="#0f172a" stroke="#64748b" stroke-width="0.7" />

          <!-- Header 4 Pins Top -->
          <text x="25" y="6.5" fill="#ffffff" font-size="3" font-family="sans-serif" font-weight="700" text-anchor="middle">GND</text>
          <text x="43" y="6.5" fill="#ffffff" font-size="3" font-family="sans-serif" font-weight="700" text-anchor="middle">VCC</text>
          <text x="61" y="6.5" fill="#ffffff" font-size="3" font-family="sans-serif" font-weight="700" text-anchor="middle">SCL</text>
          <text x="79" y="6.5" fill="#ffffff" font-size="3" font-family="sans-serif" font-weight="700" text-anchor="middle">SDA</text>

          <circle cx="25" cy="12" r="3" fill="#f59e0b" stroke="#78350f" stroke-width="0.8" />
          <circle cx="25" cy="12" r="1.3" fill="#0f172a" />
          <circle cx="43" cy="12" r="3" fill="#f59e0b" stroke="#78350f" stroke-width="0.8" />
          <circle cx="43" cy="12" r="1.3" fill="#0f172a" />
          <circle cx="61" cy="12" r="3" fill="#f59e0b" stroke="#78350f" stroke-width="0.8" />
          <circle cx="61" cy="12" r="1.3" fill="#0f172a" />
          <circle cx="79" cy="12" r="3" fill="#f59e0b" stroke="#78350f" stroke-width="0.8" />
          <circle cx="79" cy="12" r="1.3" fill="#0f172a" />

          <!-- OLED Screen Panel -->
          <rect x="10" y="20" width="84" height="78" rx="3" fill="#020617" stroke="#38bdf8" stroke-width="1.2" />
          <rect x="13" y="23" width="78" height="72" fill="#030712" />

          <!-- Screen Text Simulation -->
          <text x="52" y="44" fill="#38bdf8" font-size="7" font-family="monospace" font-weight="700" text-anchor="middle">SSD1306</text>
          <text x="52" y="56" fill="#e0f2fe" font-size="4.5" font-family="monospace" text-anchor="middle">128x64 OLED</text>
          <text x="52" y="68" fill="#94a3b8" font-size="4" font-family="monospace" text-anchor="middle">I2C: ${addr}</text>
          <rect x="18" y="74" width="68" height="15" rx="1.5" fill="#0f172a" stroke="#1e293b" stroke-width="0.8" />
          <text x="52" y="84" fill="#38bdf8" font-size="4.2" font-family="monospace" text-anchor="middle">&#x25A0; READY &#x25A0;</text>
        </svg>
      `;
    }
  }

  // =========================================================================
  // 8. STM32 Blue Pill (<board-stm32-bluepill>)
  // =========================================================================
  class BoardStm32Bluepill extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._ledPc13 = false;
      this.pinInfo = this._initPinInfo();
    }

    setLed(state) {
      this._ledPc13 = !!state;
      this.render();
    }

    _initPinInfo() {
      const pins = [];
      const leftNames = ['B12', 'B13', 'B14', 'B15', 'A8', 'A9', 'A10', 'A11', 'A12', 'A15', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', '5V', 'GND.1', '3V3.1'];
      const rightNames = ['B11', 'B10', 'B1', 'B0', 'A7', 'A6', 'A5', 'A4', 'A3', 'A2', 'A1', 'A0', 'C15', 'C14', 'C13', 'VBAT', 'RST', '3V3.2', 'GND.2', 'GND.3'];

      leftNames.forEach((n, i) => {
        pins.push({ name: n, x: 8, y: 30 + i * 9.5, label: n });
      });
      rightNames.forEach((n, i) => {
        pins.push({ name: n, x: 82, y: 30 + i * 9.5, label: n });
      });
      return pins;
    }

    connectedCallback() {
      this.render();
    }

    render() {
      const pc13Glow = this._ledPc13 ? 'fill="#22c55e" filter="url(#glowGreen)"' : 'fill="#14532d"';
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: inline-block; width: 90px; height: 230px; user-select: none; }
          svg { width: 100%; height: 100%; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.25)); }
        </style>
        <svg viewBox="0 0 90 230" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2.5" flood-color="#22c55e" />
            </filter>
          </defs>
          <!-- Blue PCB -->
          <rect x="2" y="2" width="86" height="226" rx="4" fill="#1e3a8a" stroke="#1d4ed8" stroke-width="1.2" />

          <!-- Micro USB at Top -->
          <rect x="33" y="1" width="24" height="16" rx="2" fill="#94a3b8" stroke="#475569" stroke-width="1" />
          <rect x="39" y="4" width="12" height="6" fill="#0f172a" />

          <!-- STM32F103C8T6 ARM MCU -->
          <rect x="27" y="90" width="36" height="36" rx="2" fill="#0f172a" stroke="#334155" stroke-width="1" />
          <text x="45" y="106" fill="#e2e8f0" font-size="4.2" font-family="sans-serif" font-weight="800" text-anchor="middle">STM32</text>
          <text x="45" y="113" fill="#94a3b8" font-size="3" font-family="sans-serif" text-anchor="middle">F103C8T6</text>
          <circle cx="32" cy="95" r="1.2" fill="#f8fafc" />

          <!-- Crystal Oscillators -->
          <rect x="35" y="65" width="20" height="9" rx="1.5" fill="#cbd5e1" stroke="#64748b" stroke-width="0.8" />
          <text x="45" y="71" fill="#1e293b" font-size="3" font-family="sans-serif" text-anchor="middle">8.000 MHz</text>

          <!-- Yellow BOOT Jumpers -->
          <rect x="25" y="38" width="10" height="14" fill="#eab308" stroke="#a16207" stroke-width="0.8" rx="1" />
          <rect x="55" y="38" width="10" height="14" fill="#eab308" stroke="#a16207" stroke-width="0.8" rx="1" />
          <text x="30" y="34" fill="#cbd5e1" font-size="2.8" font-family="sans-serif" text-anchor="middle">B0</text>
          <text x="60" y="34" fill="#cbd5e1" font-size="2.8" font-family="sans-serif" text-anchor="middle">B1</text>

          <!-- Reset Button -->
          <rect x="38" y="145" width="14" height="12" rx="1.5" fill="#334155" />
          <circle cx="45" cy="151" r="3.5" fill="#dc2626" />
          <text x="45" y="163" fill="#cbd5e1" font-size="2.8" font-family="sans-serif" text-anchor="middle">RESET</text>

          <!-- Power LED Red & User LED PC13 Green -->
          <circle cx="28" cy="180" r="2.2" fill="#ef4444" />
          <text x="28" y="188" fill="#94a3b8" font-size="2.6" font-family="sans-serif" text-anchor="middle">PWR</text>
          <circle cx="62" cy="180" r="2.2" ${pc13Glow} />
          <text x="62" y="188" fill="#94a3b8" font-size="2.6" font-family="sans-serif" text-anchor="middle">PC13</text>

          <!-- Bottom ST-LINK Header -->
          <text x="45" y="212" fill="#ffffff" font-size="3.2" font-family="sans-serif" font-weight="700" text-anchor="middle">SWD ST-LINK</text>
          ${[33, 41, 49, 57].map(x => `
            <circle cx="${x}" cy="220" r="2.2" fill="#f59e0b" stroke="#78350f" stroke-width="0.6" />
            <circle cx="${x}" cy="220" r="1" fill="#0f172a" />
          `).join('')}

          <!-- Pin Headers Left & Right -->
          ${Array.from({ length: 20 }).map((_, i) => `
            <circle cx="8" cy="${30 + i * 9.5}" r="2.4" fill="#f59e0b" stroke="#78350f" stroke-width="0.6" />
            <circle cx="8" cy="${30 + i * 9.5}" r="1" fill="#0f172a" />
            <circle cx="82" cy="${30 + i * 9.5}" r="2.4" fill="#f59e0b" stroke="#78350f" stroke-width="0.6" />
            <circle cx="82" cy="${30 + i * 9.5}" r="1" fill="#0f172a" />
          `).join('')}
        </svg>
      `;
    }
  }

  // =========================================================================
  // 9. ST Nucleo-64 C031C6 (<board-st-nucleo-c031c6>)
  // =========================================================================
  class BoardStNucleoC031c6 extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._ledLd4 = false;
      this.pinInfo = this._initPinInfo();
    }

    setLed(state) {
      this._ledLd4 = !!state;
      this.render();
    }

    _initPinInfo() {
      const pins = [];
      const leftUno = ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D13', 'GND.1', 'AREF'];
      const rightUno = ['IOREF', 'RESET', '3.3V', '5V', 'GND.2', 'GND.3', 'VIN', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5'];

      leftUno.forEach((n, i) => {
        pins.push({ name: n, x: 22, y: 70 + i * 8, label: n });
      });
      rightUno.forEach((n, i) => {
        pins.push({ name: n, x: 118, y: 80 + i * 8, label: n });
      });
      return pins;
    }

    connectedCallback() {
      this.render();
    }

    render() {
      const ld4Glow = this._ledLd4 ? 'fill="#22c55e" filter="url(#glowGreenLd4)"' : 'fill="#14532d"';
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: inline-block; width: 140px; height: 210px; user-select: none; }
          svg { width: 100%; height: 100%; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.22)); }
        </style>
        <svg viewBox="0 0 140 210" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="glowGreenLd4" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#22c55e" />
            </filter>
          </defs>
          <!-- White/Light Gray PCB -->
          <rect x="2" y="2" width="136" height="206" rx="6" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5" />

          <!-- ST-LINK Section at Top -->
          <rect x="6" y="6" width="128" height="42" rx="3" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1" />
          <rect x="52" y="3" width="36" height="14" rx="2" fill="#94a3b8" stroke="#475569" stroke-width="0.8" />
          <text x="70" y="32" fill="#0284c7" font-size="5" font-family="sans-serif" font-weight="800" text-anchor="middle">ST-LINK / V2-1</text>

          <!-- Main STM32C031C6 Section -->
          <text x="70" y="62" fill="#0f172a" font-size="5.5" font-family="sans-serif" font-weight="800" text-anchor="middle">NUCLEO-C031C6</text>

          <!-- MCU QFP-48 in Center -->
          <rect x="54" y="95" width="32" height="32" rx="2" fill="#0f172a" stroke="#334155" stroke-width="1" />
          <text x="70" y="112" fill="#f8fafc" font-size="3.8" font-family="sans-serif" font-weight="800" text-anchor="middle">STM32</text>
          <text x="70" y="118" fill="#94a3b8" font-size="2.8" font-family="sans-serif" text-anchor="middle">C031C6</text>

          <!-- Blue User Button B1 & Black Reset Button -->
          <circle cx="36" cy="165" r="5" fill="#0284c7" />
          <text x="36" y="176" fill="#64748b" font-size="2.8" font-family="sans-serif" text-anchor="middle">USER B1</text>
          <circle cx="104" cy="165" r="5" fill="#0f172a" />
          <text x="104" y="176" fill="#64748b" font-size="2.8" font-family="sans-serif" text-anchor="middle">RESET</text>

          <!-- User LED LD4 (PA5 / D13) -->
          <circle cx="70" cy="150" r="2.8" ${ld4Glow} />
          <text x="70" y="158" fill="#059669" font-size="2.8" font-family="sans-serif" font-weight="700" text-anchor="middle">LD4 (PA5)</text>

          <!-- Arduino Compatible Pin Headers -->
          ${Array.from({ length: 16 }).map((_, i) => `
            <circle cx="22" cy="${70 + i * 8}" r="2" fill="#0f172a" stroke="#f59e0b" stroke-width="0.6" />
          `).join('')}
          ${Array.from({ length: 13 }).map((_, i) => `
            <circle cx="118" cy="${80 + i * 8}" r="2" fill="#0f172a" stroke="#f59e0b" stroke-width="0.6" />
          `).join('')}
        </svg>
      `;
    }
  }

  // =========================================================================
  // 10. ST Nucleo-32 L031K6 (<board-st-nucleo-l031k6>)
  // =========================================================================
  class BoardStNucleoL031k6 extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._ledLd3 = false;
      this.pinInfo = this._initPinInfo();
    }

    setLed(state) {
      this._ledLd3 = !!state;
      this.render();
    }

    _initPinInfo() {
      const pins = [];
      const left = ['D1', 'D0', 'RESET', 'GND.1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12'];
      const right = ['VIN', 'GND.2', 'RESET.2', '5V', 'A7', 'A6', 'A5', 'A4', 'A3', 'A2', 'A1', 'A0', 'AREF', '3.3V', 'D13'];

      left.forEach((n, i) => {
        pins.push({ name: n, x: 8, y: 35 + i * 9.5, label: n });
      });
      right.forEach((n, i) => {
        pins.push({ name: n, x: 72, y: 35 + i * 9.5, label: n });
      });
      return pins;
    }

    connectedCallback() {
      this.render();
    }

    render() {
      const ld3Glow = this._ledLd3 ? 'fill="#22c55e" filter="url(#glowGreenLd3)"' : 'fill="#14532d"';
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: inline-block; width: 80px; height: 185px; user-select: none; }
          svg { width: 100%; height: 100%; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.22)); }
        </style>
        <svg viewBox="0 0 80 185" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="glowGreenLd3" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#22c55e" />
            </filter>
          </defs>
          <!-- White PCB -->
          <rect x="2" y="2" width="76" height="181" rx="4" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.2" />

          <!-- Micro USB at Top -->
          <rect x="28" y="1" width="24" height="14" rx="2" fill="#94a3b8" stroke="#475569" stroke-width="1" />

          <!-- Board Label -->
          <text x="40" y="28" fill="#0284c7" font-size="3.8" font-family="sans-serif" font-weight="800" text-anchor="middle">NUCLEO-L031K6</text>

          <!-- MCU Chip -->
          <rect x="26" y="65" width="28" height="28" rx="2" fill="#0f172a" stroke="#334155" stroke-width="1" />
          <text x="40" y="80" fill="#f8fafc" font-size="3.2" font-family="sans-serif" font-weight="800" text-anchor="middle">STM32</text>
          <text x="40" y="86" fill="#94a3b8" font-size="2.4" font-family="sans-serif" text-anchor="middle">L031K6</text>

          <!-- Reset Button -->
          <circle cx="40" cy="115" r="4" fill="#0f172a" />
          <text x="40" y="125" fill="#64748b" font-size="2.4" font-family="sans-serif" text-anchor="middle">RESET</text>

          <!-- LD3 LED (PB3 / D13) -->
          <circle cx="40" cy="140" r="2.5" ${ld3Glow} />
          <text x="40" y="148" fill="#059669" font-size="2.5" font-family="sans-serif" font-weight="700" text-anchor="middle">LD3 (PB3)</text>

          <!-- Pin Headers Left & Right -->
          ${Array.from({ length: 15 }).map((_, i) => `
            <circle cx="8" cy="${35 + i * 9.5}" r="2.2" fill="#f59e0b" stroke="#78350f" stroke-width="0.6" />
            <circle cx="8" cy="${35 + i * 9.5}" r="0.9" fill="#0f172a" />
            <circle cx="72" cy="${35 + i * 9.5}" r="2.2" fill="#f59e0b" stroke="#78350f" stroke-width="0.6" />
            <circle cx="72" cy="${35 + i * 9.5}" r="0.9" fill="#0f172a" />
          `).join('')}
        </svg>
      `;
    }
  }

  // =========================================================================
  // 11. Simulated WiFi Access Point (<wokwi-wifi-ap>)
  // =========================================================================
  class WokwiWifiAp extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.ssid = 'MyNetwork';
      this.pinInfo = [
        { name: 'ANT', x: 50, y: 15, label: 'RF Antenna' }
      ];
    }

    connectedCallback() {
      this.render();
    }

    render() {
      const ssid = this.getAttribute('ssid') || this.ssid || 'MyNetwork';
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: inline-block; width: 100px; height: 115px; user-select: none; }
          svg { width: 100%; height: 100%; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.25)); }
        </style>
        <svg viewBox="0 0 100 115" xmlns="http://www.w3.org/2000/svg">
          <!-- Black Housing -->
          <rect x="4" y="32" width="92" height="78" rx="8" fill="#0f172a" stroke="#334155" stroke-width="1.4" />

          <!-- Dual Antennas at Top -->
          <line x1="24" y1="32" x2="16" y2="6" stroke="#475569" stroke-width="4" stroke-linecap="round" />
          <line x1="76" y1="32" x2="84" y2="6" stroke="#475569" stroke-width="4" stroke-linecap="round" />

          <!-- WiFi Icon Center -->
          <path d="M 38 60 A 18 18 0 0 1 62 60" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" />
          <path d="M 42 66 A 12 12 0 0 1 58 66" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" />
          <circle cx="50" cy="72" r="2.5" fill="#38bdf8" />

          <!-- SSID Label -->
          <text x="50" y="87" fill="#ffffff" font-size="4.8" font-family="sans-serif" font-weight="700" text-anchor="middle">${ssid}</text>
          <text x="50" y="96" fill="#94a3b8" font-size="3.5" font-family="sans-serif" text-anchor="middle">2.4 GHz 802.11 b/g/n</text>

          <!-- LEDs at Bottom -->
          <circle cx="36" cy="104" r="2" fill="#22c55e" />
          <circle cx="50" cy="104" r="2" fill="#38bdf8" />
          <circle cx="64" cy="104" r="2" fill="#eab308" />
        </svg>
      `;
    }
  }

  // Register Custom Web Components
  const definitions = [
    { tag: 'wokwi-pi-pico', cls: WokwiPiPico },
    { tag: 'board-franzininho-wifi', cls: BoardFranzininhoWifi },
    { tag: 'board-bmp180', cls: BoardBmp180 },
    { tag: 'board-mfrc522', cls: BoardMfrc522 },
    { tag: 'wokwi-relay-module', cls: WokwiRelayModule },
    { tag: 'board-grove-oled-sh1107', cls: BoardGroveOledSh1107 },
    { tag: 'board-ssd1306', cls: BoardSsd1306 },
    { tag: 'wokwi-ssd1306', cls: BoardSsd1306 },
    { tag: 'board-stm32-bluepill', cls: BoardStm32Bluepill },
    { tag: 'board-st-nucleo-c031c6', cls: BoardStNucleoC031c6 },
    { tag: 'board-st-nucleo-l031k6', cls: BoardStNucleoL031k6 },
    { tag: 'wokwi-wifi-ap', cls: WokwiWifiAp }
  ];

  definitions.forEach(({ tag, cls }) => {
    if (!customElements.get(tag)) {
      customElements.define(tag, cls);
    }
  });

  // Export to window
  window.WokwiPiPico = WokwiPiPico;
  window.BoardFranzininhoWifi = BoardFranzininhoWifi;
  window.BoardBmp180 = BoardBmp180;
  window.BoardMfrc522 = BoardMfrc522;
  window.WokwiRelayModule = WokwiRelayModule;
  window.BoardGroveOledSh1107 = BoardGroveOledSh1107;
  window.BoardSsd1306 = BoardSsd1306;
  window.BoardStm32Bluepill = BoardStm32Bluepill;
  window.BoardStNucleoC031c6 = BoardStNucleoC031c6;
  window.BoardStNucleoL031k6 = BoardStNucleoL031k6;
  window.WokwiWifiAp = WokwiWifiAp;
})();
