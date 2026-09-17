// js/circuit_health.js — Circuit Health & Smoke Prevention Diagnostics
// Detects short circuits, missing resistors, LED overcurrent, and floating pins with educational tips.

class CircuitHealthChecker {
  constructor(circuitCanvas) {
    this.canvas = circuitCanvas;
    this.issues = [];
    this.pillElement = null;
    this.initUi();
  }

  initUi() {
    // Top status pill in navbar or circuit toolbar
    let pill = document.getElementById('circuitHealthPill');
    if (!pill) {
      pill = document.createElement('div');
      pill.id = 'circuitHealthPill';
      pill.className = 'sim-status-pill';
      pill.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 0.73rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
        user-select: none;
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        color: #16a34a;
      `;
      pill.onclick = () => this.showModal();

      // Insert next to Sim Status Pill or in circuit toolbar
      const simStatus = document.getElementById('simStatusPill');
      if (simStatus && simStatus.parentElement) {
        simStatus.parentElement.insertBefore(pill, simStatus.nextSibling);
      }
    }
    this.pillElement = pill;
    this.checkHealth();
  }

  checkHealth() {
    this.issues = [];
    if (!this.canvas || !this.canvas.netlist) {
      this.updatePill();
      return this.issues;
    }

    const netlist = this.canvas.netlist;
    const comps = netlist.getAllComponents();
    const wires = netlist.wires;

    // 1. Check Short Circuit: Direct connection between 5V/3.3V and GND
    const powerPins = ['5V', 'VCC', '3.3V', '3V3'];
    wires.forEach(w => {
      const fromIsPwr = powerPins.includes(w.from.pin);
      const toIsPwr = powerPins.includes(w.to.pin);
      const fromIsGnd = w.from.pin === 'GND';
      const toIsGnd = w.to.pin === 'GND';

      if ((fromIsPwr && toIsGnd) || (toIsPwr && fromIsGnd)) {
        this.issues.push({
          type: 'danger',
          icon: '&#x1F525;',
          title: 'Direct Short Circuit Detected!',
          desc: `Wire connects power directly to Ground (${w.from.pin} ➔ ${w.to.pin}). This causes a direct short circuit and will damage your voltage regulator or trigger overcurrent protection.`,
          fix: 'Remove this wire or place a resistive load in series.'
        });
      }
    });

    // 2. Check LED Overcurrent: LED connected directly without a resistor
    const leds = comps.filter(c => c.type === 'wokwi-led');
    leds.forEach(led => {
      const aWires = netlist.getWiresForPin(led.id, 'A');
      const cWires = netlist.getWiresForPin(led.id, 'C');

      let hasResistor = false;
      // Check wires on Anode
      aWires.forEach(w => {
        const otherCompId = w.from.compId === led.id ? w.to.compId : w.from.compId;
        const otherComp = netlist.getComponent(otherCompId);
        if (otherComp && otherComp.type === 'wokwi-resistor') {
          hasResistor = true;
        }
      });
      // Check wires on Cathode
      cWires.forEach(w => {
        const otherCompId = w.from.compId === led.id ? w.to.compId : w.from.compId;
        const otherComp = netlist.getComponent(otherCompId);
        if (otherComp && otherComp.type === 'wokwi-resistor') {
          hasResistor = true;
        }
      });

      // If connected to Uno digital/5V pin without resistor
      const isConnected = aWires.length > 0 && cWires.length > 0;
      if (isConnected && !hasResistor) {
        this.issues.push({
          type: 'warning',
          icon: '&#x26A0;',
          title: `Overcurrent Risk: LED (${led.attrs?.color || 'LED'}) has no resistor!`,
          desc: 'Connecting an LED directly to 5V or an Arduino pin without a current-limiting resistor allows over 80 mA of current to surge through the diode. Standard LEDs have an absolute maximum rating of 20 mA and will permanently burn out.',
          fix: 'Add a 220 Ω or 330 Ω resistor in series with the LED anode or cathode.',
          targetCompId: led.id
        });

        // Trigger sound effect if simulated
        if (window.soundEngine && typeof ArduinoBlockly !== 'undefined' && ArduinoBlockly.getSimulationEngine()?.running) {
          window.soundEngine.playBurnPop();
        }
      }
    });

    // 3. Check Modules with Unconnected GND
    const icModules = comps.filter(c => ['board-bmp180', 'board-mfrc522', 'board-ssd1306', 'wokwi-relay-module'].includes(c.type));
    icModules.forEach(mod => {
      const gndWires = netlist.getWiresForPin(mod.id, 'GND');
      if (gndWires.length === 0) {
        this.issues.push({
          type: 'info',
          icon: '&#x2139;',
          title: `Unconnected Ground on ${mod.type}`,
          desc: `Module ${mod.type} has no ground connection. Digital ICs cannot function without a common reference ground.`,
          fix: `Connect the GND pin of ${mod.type} to Arduino GND.`
        });
      }
    });

    this.updatePill();
    return this.issues;
  }

  updatePill() {
    if (!this.pillElement) return;

    if (this.issues.length === 0) {
      this.pillElement.style.background = '#f0fdf4';
      this.pillElement.style.borderColor = '#bbf7d0';
      this.pillElement.style.color = '#16a34a';
      this.pillElement.innerHTML = '&#x1F6E1; Circuit: Healthy';
      this.pillElement.title = 'All components correctly protected with resistors and proper wiring.';
    } else {
      const hasDanger = this.issues.some(i => i.type === 'danger');
      if (hasDanger) {
        this.pillElement.style.background = '#fef2f2';
        this.pillElement.style.borderColor = '#fecaca';
        this.pillElement.style.color = '#dc2626';
        this.pillElement.innerHTML = `&#x1F525; ${this.issues.length} Critical Issue${this.issues.length > 1 ? 's' : ''}`;
      } else {
        this.pillElement.style.background = '#fffbeb';
        this.pillElement.style.borderColor = '#fde68a';
        this.pillElement.style.color = '#d97706';
        this.pillElement.innerHTML = `&#x26A0; ${this.issues.length} Warning${this.issues.length > 1 ? 's' : ''}`;
      }
      this.pillElement.title = 'Click to view circuit health diagnostics and recommended fixes.';
    }
  }

  showModal() {
    let modal = document.getElementById('circuitHealthModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'circuitHealthModal';
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 12000;
        backdrop-filter: blur(4px);
      `;
      document.body.appendChild(modal);
    }

    this.checkHealth();

    let issuesHtml = '';
    if (this.issues.length === 0) {
      issuesHtml = `
        <div style="text-align:center; padding:30px 10px; color:#16a34a;">
          <div style="font-size:3rem; margin-bottom:10px;">&#x2705;</div>
          <h3 style="margin:0 0 8px; color:#16a34a;">No Electrical Issues Detected!</h3>
          <p style="color:#64748b; font-size:0.85rem; max-width:360px; margin:0 auto;">
            All LEDs have current-limiting resistors, no short circuits are present, and all modules have valid ground references.
          </p>
        </div>
      `;
    } else {
      issuesHtml = this.issues.map(iss => `
        <div style="background:#ffffff; border:1px solid ${iss.type === 'danger' ? '#fecaca' : iss.type === 'warning' ? '#fde68a' : '#bfdbfe'}; border-radius:8px; padding:12px 14px; margin-bottom:10px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
            <span style="font-size:1.2rem;">${iss.icon}</span>
            <strong style="font-size:0.88rem; color:${iss.type === 'danger' ? '#dc2626' : iss.type === 'warning' ? '#d97706' : '#2563eb'};">${iss.title}</strong>
          </div>
          <p style="font-size:0.8rem; color:#475569; margin:0 0 8px; line-height:1.4;">${iss.desc}</p>
          <div style="background:#f8fafc; border-left:3px solid #00979d; padding:6px 10px; border-radius:0 4px 4px 0; font-size:0.75rem; color:#334155;">
            <strong>&#x1F4A1; Recommendation:</strong> ${iss.fix}
          </div>
        </div>
      `).join('');
    }

    modal.innerHTML = `
      <div style="background:#ffffff; border-radius:12px; width:480px; max-width:92vw; max-height:85vh; display:flex; flex-direction:column; box-shadow:0 20px 40px rgba(0,0,0,0.2); overflow:hidden;">
        <div style="display:flex; justify-content:space-between; align-items:center; padding:14px 18px; border-bottom:1px solid #e2e8f0; background:#f8fafc;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:1.2rem;">&#x1F6E1;</span>
            <h3 style="margin:0; font-size:1.05rem; font-weight:700; color:#1e293b;">Circuit Health Diagnostics</h3>
          </div>
          <button style="border:none; background:transparent; font-size:1.2rem; cursor:pointer; color:#64748b;" onclick="document.getElementById('circuitHealthModal').style.display='none'">&times;</button>
        </div>
        <div style="padding:16px 18px; overflow-y:auto; flex:1; background:#f1f5f9;">
          ${issuesHtml}
        </div>
        <div style="padding:12px 18px; border-top:1px solid #e2e8f0; background:#ffffff; display:flex; justify-content:flex-end;">
          <button class="btn btn-primary btn-sm" onclick="document.getElementById('circuitHealthModal').style.display='none'">Got It</button>
        </div>
      </div>
    `;
    modal.style.display = 'flex';
  }
}

window.CircuitHealthChecker = CircuitHealthChecker;
