// js/serial_plotter.js — High-Performance Real-Time Multi-Channel Waveform Plotter
// Plots incoming Serial numbers, analog sensor data, and PWM waveforms in real-time.

class SerialPlotter {
  constructor(canvasId, containerId) {
    this.canvas = document.getElementById(canvasId);
    this.container = document.getElementById(containerId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    this.channels = [
      { name: 'CH 1', color: '#00979d', active: true },
      { name: 'CH 2', color: '#e47128', active: true },
      { name: 'CH 3', color: '#805ad5', active: true },
      { name: 'CH 4', color: '#16a34a', active: true },
      { name: 'CH 5', color: '#dc2626', active: true },
      { name: 'CH 6', color: '#2563eb', active: true }
    ];

    // Data points: Array of { t: timestamp_ms, values: [ch0, ch1, ...] }
    this.data = [];
    this.maxPoints = 2000;
    this.windowSeconds = 10; // default 10s sliding window
    this.autoScale = true;
    this.fixedMin = 0;
    this.fixedMax = 1023;
    this.isPaused = false;

    this.hoverX = null;
    this.hoverY = null;
    this.animId = null;

    this.startTime = Date.now();

    this.initEvents();
    this.resizeCanvas();
    this.startRenderLoop();
  }

  initEvents() {
    if (!this.canvas) return;

    window.addEventListener('resize', () => this.resizeCanvas());

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.hoverX = e.clientX - rect.left;
      this.hoverY = e.clientY - rect.top;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.hoverX = null;
      this.hoverY = null;
    });
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const dpr = window.devicePixelRatio || 1;
    const w = parent.clientWidth || 600;
    const h = parent.clientHeight || 300;

    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';

    if (this.ctx) {
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  setWindowSeconds(sec) {
    this.windowSeconds = Math.max(1, Number(sec) || 10);
  }

  setRange(mode, min = 0, max = 1023) {
    if (mode === 'auto') {
      this.autoScale = true;
    } else {
      this.autoScale = false;
      this.fixedMin = min;
      this.fixedMax = max;
    }
  }

  togglePause(paused = !this.isPaused) {
    this.isPaused = paused;
    return this.isPaused;
  }

  clear() {
    this.data = [];
    this.startTime = Date.now();
    this.updateLegend();
  }

  // Parses incoming serial string (e.g. "512", "120, 450, 30", or "temp:24.5, humidity:60")
  addSerialLine(line) {
    if (this.isPaused) return;
    if (!line || typeof line !== 'string') return;

    const trimmed = line.trim();
    if (!trimmed) return;

    // Detect comma, tab, semicolon, or space-separated tokens
    const tokens = trimmed.split(/[\s,;]+/);
    const parsedValues = [];

    for (let i = 0; i < tokens.length && parsedValues.length < 6; i++) {
      const token = tokens[i];
      // Check for labeled format like "val:123" or "temp=24.5"
      const labelMatch = token.match(/([a-zA-Z0-9_-]+)[:=]([-+]?\d*\.?\d+)/);
      if (labelMatch) {
        const label = labelMatch[1];
        const num = parseFloat(labelMatch[2]);
        if (!isNaN(num)) {
          parsedValues.push(num);
          if (this.channels[parsedValues.length - 1]) {
            this.channels[parsedValues.length - 1].name = label;
          }
        }
      } else {
        const num = parseFloat(token);
        if (!isNaN(num)) {
          parsedValues.push(num);
        }
      }
    }

    if (parsedValues.length > 0) {
      const now = Date.now();
      this.data.push({ t: now, values: parsedValues });

      if (this.data.length > this.maxPoints) {
        this.data.shift();
      }

      this.updateLegend();
    }
  }

  updateLegend() {
    const legendEl = document.getElementById('plotterLegend');
    if (!legendEl) return;

    let activeCount = 0;
    this.data.forEach(d => {
      if (d.values.length > activeCount) activeCount = d.values.length;
    });

    if (activeCount === 0) activeCount = 1;

    let html = '';
    for (let i = 0; i < activeCount && i < this.channels.length; i++) {
      const ch = this.channels[i];
      const lastVal = this.data.length > 0 && this.data[this.data.length - 1].values[i] !== undefined
        ? this.data[this.data.length - 1].values[i].toFixed(2)
        : '--';

      html += `
        <div class="plotter-legend-item" style="display:inline-flex; align-items:center; gap:6px; margin-right:12px; font-size:0.75rem;">
          <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${ch.color};"></span>
          <span style="font-weight:600; color:#334155;">${ch.name}:</span>
          <span style="font-family:monospace; font-weight:700; color:${ch.color}; min-width:40px;">${lastVal}</span>
        </div>
      `;
    }
    legendEl.innerHTML = html;
  }

  exportCsv() {
    if (this.data.length === 0) {
      alert('No data points to export yet. Run simulation to collect data!');
      return;
    }

    let csv = 'Timestamp_ms';
    const channelCount = Math.max(...this.data.map(d => d.values.length));
    for (let i = 0; i < channelCount; i++) {
      csv += `,${this.channels[i].name || 'CH' + (i + 1)}`;
    }
    csv += '\n';

    const t0 = this.data[0].t;
    this.data.forEach(d => {
      let row = (d.t - t0).toString();
      for (let i = 0; i < channelCount; i++) {
        row += `,${d.values[i] !== undefined ? d.values[i] : ''}`;
      }
      csv += row + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `serial_plotter_data_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  startRenderLoop() {
    const render = () => {
      this.draw();
      this.animId = requestAnimationFrame(render);
    };
    this.animId = requestAnimationFrame(render);
  }

  draw() {
    if (!this.canvas || !this.ctx) return;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    if (w <= 0 || h <= 0) return;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);

    // Padding for axes
    const padL = 48;
    const padR = 20;
    const padT = 20;
    const padB = 30;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    if (plotW <= 10 || plotH <= 10) return;

    // Background
    ctx.fillStyle = '#0f172a'; // Deep engineering dark slate
    ctx.fillRect(padL, padT, plotW, plotH);

    // Time window calculation
    const now = Date.now();
    const windowMs = this.windowSeconds * 1000;
    const tMin = now - windowMs;
    const tMax = now;

    // Filter points in window
    const visibleData = this.data.filter(d => d.t >= tMin - 1000);

    // Min / Max Y scale
    let yMin = this.fixedMin;
    let yMax = this.fixedMax;

    if (this.autoScale) {
      if (visibleData.length > 0) {
        let minVal = Infinity;
        let maxVal = -Infinity;
        visibleData.forEach(d => {
          d.values.forEach(v => {
            if (v < minVal) minVal = v;
            if (v > maxVal) maxVal = v;
          });
        });
        if (minVal !== Infinity && maxVal !== -Infinity) {
          const span = maxVal - minVal;
          const pad = span > 0 ? span * 0.15 : 10;
          yMin = Math.floor(minVal - pad);
          yMax = Math.ceil(maxVal + pad);
          if (yMin === yMax) {
            yMin -= 5;
            yMax += 5;
          }
        }
      } else {
        yMin = 0;
        yMax = 100;
      }
    }

    const yRange = yMax - yMin || 1;

    // Coordinate transforms
    const timeToX = (t) => padL + ((t - tMin) / windowMs) * plotW;
    const valToY = (v) => padT + plotH - ((v - yMin) / yRange) * plotH;

    // Draw Grid Lines (Horizontal Y-grid)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Inter, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const v = yMin + (yRange / ySteps) * i;
      const y = padT + plotH - (plotH / ySteps) * i;

      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + plotW, y);
      ctx.stroke();

      ctx.fillText(Math.round(v).toString(), padL - 6, y);
    }

    // Draw Time Grid (Vertical X-grid)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const xSteps = 5;
    for (let i = 0; i <= xSteps; i++) {
      const x = padL + (plotW / xSteps) * i;
      const secAgo = Math.round(this.windowSeconds - (this.windowSeconds / xSteps) * i);

      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + plotH);
      ctx.stroke();

      ctx.fillText(`-${secAgo}s`, x, padT + plotH + 6);
    }

    // Border around plot
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.strokeRect(padL, padT, plotW, plotH);

    // Plot Channels
    if (visibleData.length > 1) {
      // Find max channel count
      const channelCount = Math.max(...visibleData.map(d => d.values.length));

      ctx.save();
      // Clip to plot area
      ctx.beginPath();
      ctx.rect(padL, padT, plotW, plotH);
      ctx.clip();

      for (let ch = 0; ch < channelCount; ch++) {
        if (!this.channels[ch] || !this.channels[ch].active) continue;

        ctx.strokeStyle = this.channels[ch].color;
        ctx.lineWidth = 2;
        ctx.beginPath();

        let started = false;
        visibleData.forEach(d => {
          if (d.values[ch] !== undefined) {
            const x = timeToX(d.t);
            const y = valToY(d.values[ch]);
            if (!started) {
              ctx.moveTo(x, y);
              started = true;
            } else {
              ctx.lineTo(x, y);
            }
          }
        });
        ctx.stroke();
      }
      ctx.restore();
    }

    // Hover Crosshair & Data Tooltip
    if (this.hoverX !== null && this.hoverX >= padL && this.hoverX <= padL + plotW) {
      // Vertical crosshair
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(this.hoverX, padT);
      ctx.lineTo(this.hoverX, padT + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Find closest data point in time
      const targetTime = tMin + ((this.hoverX - padL) / plotW) * windowMs;
      let closestPoint = null;
      let minDiff = Infinity;

      visibleData.forEach(d => {
        const diff = Math.abs(d.t - targetTime);
        if (diff < minDiff) {
          minDiff = diff;
          closestPoint = d;
        }
      });

      if (closestPoint && minDiff < 1500) {
        // Draw hover tooltip
        const tipX = Math.min(this.hoverX + 12, padL + plotW - 140);
        const tipY = Math.max(padT + 10, Math.min(this.hoverY || padT, padT + plotH - 70));

        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        const tipH = 20 + closestPoint.values.length * 16;
        ctx.fillRect(tipX, tipY, 130, tipH);
        ctx.strokeRect(tipX, tipY, 130, tipH);

        ctx.fillStyle = '#38bdf8';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`T: -${((now - closestPoint.t) / 1000).toFixed(1)}s`, tipX + 8, tipY + 6);

        closestPoint.values.forEach((v, idx) => {
          const ch = this.channels[idx] || { name: `CH${idx + 1}`, color: '#fff' };
          ctx.fillStyle = ch.color;
          ctx.fillText(`${ch.name}: ${v.toFixed(2)}`, tipX + 8, tipY + 20 + idx * 16);
        });
      }
    }
  }
}

window.SerialPlotter = SerialPlotter;
