// Simulation Block Runner for IrieBlocky
// Interprets Blockly blocks directly and drives the Virtual Arduino SimulationEngine.

class SimRunner {
  constructor(engine) {
    this.engine = engine;
    this.variables = new Map();
    this.functions = new Map();
    this.abortSignal = null;
    this.workspace = null;
    this.highlightBlocks = false; // Optional visual step highlighting
  }

  // Main entry: run sketch until stopped
  async run(workspace) {
    this.workspace = workspace;
    this.variables.clear();
    this.functions.clear();
    this.abortSignal = this.engine.signal;

    if (!workspace) {
      console.warn('[SimRunner] No workspace provided.');
      return;
    }

    // 1. Index all user-defined functions
    const allBlocks = workspace.getAllBlocks();
    for (const b of allBlocks) {
      if (b.type === 'procedures_defnoreturn' || b.type === 'procedures_defreturn') {
        const fnName = b.getFieldValue('NAME');
        if (fnName) {
          this.functions.set(fnName, b);
        }
      }
    }

    // 2. Find top-level setup and loop blocks
    const topBlocks = workspace.getTopBlocks(true);
    let setupBlock = topBlocks.find(b => b.type === 'arduino_setup');
    let loopBlock = topBlocks.find(b => b.type === 'arduino_loop');

    // If not found in topBlocks, search allBlocks
    if (!setupBlock) setupBlock = allBlocks.find(b => b.type === 'arduino_setup');
    if (!loopBlock) loopBlock = allBlocks.find(b => b.type === 'arduino_loop');

    try {
      // 3. Execute setup() ONCE
      if (setupBlock) {
        const setupStatements = setupBlock.getInputTargetBlock('SETUP_STATEMENTS');
        if (setupStatements) {
          await this._runSequence(setupStatements);
        }
      }

      // 4. Run loop() repeatedly until simulation is stopped
      while (!this._isAborted()) {
        if (this.engine.paused) {
          await this.engine.delay(50, this.abortSignal);
          continue;
        }

        if (loopBlock) {
          const loopStatements = loopBlock.getInputTargetBlock('LOOP_STATEMENTS');
          if (loopStatements) {
            await this._runSequence(loopStatements);
          } else {
            // Empty loop block: idle sleep
            await this.engine.delay(50, this.abortSignal);
          }
        } else {
          // If no loop block was placed, just keep running until stopped
          await this.engine.delay(100, this.abortSignal);
        }

        // Tiny cooperative yield to keep the UI thread fully responsive
        await this.engine.delay(1, this.abortSignal);
      }
    } catch (err) {
      if (err.name === 'AbortError' || (this.abortSignal && this.abortSignal.aborted)) {
        // Normal simulation stop
        console.log('[SimRunner] Simulation stopped.');
      } else {
        console.error('[SimRunner] Runtime Error:', err);
        if (this.engine) {
          this.engine.Serial.println(`[Runtime Error] ${err.message}`);
        }
      }
    } finally {
      if (this.workspace && this.highlightBlocks) {
        this.workspace.highlightBlock(null);
      }
    }
  }

  _isAborted() {
    return !this.engine.running || (this.abortSignal && this.abortSignal.aborted);
  }

  // Execute a block and follow its nextConnection chain
  async _runSequence(block) {
    let current = block;
    while (current && !this._isAborted()) {
      // Check pause state
      while (this.engine.paused && !this._isAborted()) {
        await this.engine.delay(50, this.abortSignal);
      }

      if (this.highlightBlocks && this.workspace) {
        this.workspace.highlightBlock(current.id);
      }

      await this._exec(current);

      current = current.getNextBlock ? current.getNextBlock() : (current.nextConnection && current.nextConnection.targetBlock());
    }
  }

  // ---------------------------------------------------------------------------
  // Statement Execution
  // ---------------------------------------------------------------------------

  async _exec(block) {
    if (!block || this._isAborted()) return;

    switch (block.type) {
      // Arduino Core Statements
      case 'serial_begin': {
        const baud = parseInt(block.getFieldValue('BAUD') || '9600', 10);
        this.engine.Serial.begin(baud);
        break;
      }

      case 'delay_ms':
      case 'wait_ms': {
        const ms = parseInt(block.getFieldValue('MS') || '0', 10);
        await this.engine.delay(ms, this.abortSignal);
        break;
      }

      case 'wait_forever': {
        while (!this._isAborted()) {
          await this.engine.delay(100, this.abortSignal);
        }
        break;
      }

      case 'digital_write': {
        const pin = block.getFieldValue('PIN');
        const state = block.getFieldValue('STATE') === 'HIGH' ? 1 : 0;
        await this.engine.digitalWrite(pin, state);
        break;
      }

      case 'pwm_write': {
        const pin = block.getFieldValue('PIN');
        const valInput = block.getInputTargetBlock('VALUE');
        const val = valInput ? await this._eval(valInput) : parseInt(block.getFieldValue('VALUE') || '0', 10);
        await this.engine.analogWrite(pin, val);
        break;
      }

      case 'led_write': {
        const state = block.getFieldValue('STATE') === 'HIGH' ? 1 : 0;
        await this.engine.digitalWrite(13, state);
        break;
      }

      case 'tone_start': {
        const pin = block.getFieldValue('PIN');
        const freq = parseInt(block.getFieldValue('FREQ') || '440', 10);
        this.engine.tone(pin, freq);
        break;
      }

      case 'tone_stop': {
        const pin = block.getFieldValue('PIN');
        this.engine.noTone(pin);
        break;
      }

      // Servo
      case 'servo_attach': {
        // Servo attach registered in netlist/engine
        break;
      }

      case 'servo_detach': {
        const name = block.getFieldValue('NAME') || 'myServo';
        this.engine.setServoByName(name, 90);
        break;
      }

      case 'servo_write': {
        const name = block.getFieldValue('NAME') || 'myServo';
        const angleInput = block.getInputTargetBlock('ANGLE');
        const angle = angleInput ? await this._eval(angleInput) : parseInt(block.getFieldValue('ANGLE') || '90', 10);
        this.engine.setServoByName(name, angle);
        break;
      }

      // Motor Controls
      case 'l298n_attach': {
        break;
      }

      case 'l298n_set_direction': {
        const dir = block.getFieldValue('DIRECTION');
        this.engine.Serial.println(`[Motor] Direction set to ${dir}`);
        break;
      }

      case 'l298n_set_speed': {
        const spdInput = block.getInputTargetBlock('SPEED');
        const spd = spdInput ? await this._eval(spdInput) : 150;
        this.engine.Serial.println(`[Motor] Speed set to ${spd}`);
        break;
      }

      case 'stepper_create_2pin':
      case 'stepper_create_4pin':
      case 'stepper_set_speed': {
        break;
      }

      case 'stepper_step': {
        const stepsInput = block.getInputTargetBlock('STEPS');
        const steps = stepsInput ? await this._eval(stepsInput) : 100;
        this.engine.Serial.println(`[Stepper] Stepped ${steps} steps`);
        await this.engine.delay(Math.abs(steps) * 2, this.abortSignal);
        break;
      }

      // Variables
      case 'variables_set': {
        const varName = block.getFieldValue('VAR');
        const valBlock = block.getInputTargetBlock('VALUE');
        const val = valBlock ? await this._eval(valBlock) : 0;
        this.variables.set(varName, val);
        break;
      }

      // Control Flow
      case 'controls_if': {
        let n = 0;
        let matched = false;
        while (block.getInput('IF' + n) && !this._isAborted()) {
          const condBlock = block.getInputTargetBlock('IF' + n);
          const cond = condBlock ? Boolean(await this._eval(condBlock)) : false;
          if (cond) {
            matched = true;
            const doBlock = block.getInputTargetBlock('DO' + n);
            if (doBlock) await this._runSequence(doBlock);
            break;
          }
          n++;
        }
        if (!matched && block.getInput('ELSE') && !this._isAborted()) {
          const elseBlock = block.getInputTargetBlock('ELSE');
          if (elseBlock) await this._runSequence(elseBlock);
        }
        break;
      }

      case 'controls_repeat_ext': {
        const timesBlock = block.getInputTargetBlock('TIMES');
        const times = Math.max(0, Math.min(100000, timesBlock ? Number(await this._eval(timesBlock)) : 0));
        const doBlock = block.getInputTargetBlock('DO');

        for (let i = 0; i < times && !this._isAborted(); i++) {
          if (doBlock) await this._runSequence(doBlock);
          if (i % 100 === 0) await this.engine.delay(0, this.abortSignal);
        }
        break;
      }

      case 'controls_whileUntil': {
        const until = block.getFieldValue('MODE') === 'UNTIL';
        const boolBlock = block.getInputTargetBlock('BOOL');
        const doBlock = block.getInputTargetBlock('DO');

        let guard = 0;
        while (!this._isAborted()) {
          const cond = boolBlock ? Boolean(await this._eval(boolBlock)) : false;
          const shouldRun = until ? !cond : cond;
          if (!shouldRun) break;

          if (doBlock) await this._runSequence(doBlock);

          guard++;
          if (guard % 50 === 0) {
            await this.engine.delay(1, this.abortSignal);
          }
        }
        break;
      }

      // Procedures / Functions
      case 'procedures_defnoreturn':
      case 'procedures_defreturn': {
        // Definition handled at startup
        break;
      }

      case 'procedures_callnoreturn': {
        const fnName = block.getFieldValue('NAME');
        const defBlock = this.functions.get(fnName);
        if (defBlock) {
          const stackBlock = defBlock.getInputTargetBlock('STACK');
          if (stackBlock) await this._runSequence(stackBlock);
        }
        break;
      }

      default:
        // Skip unrecognized statement block without crashing
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Expression / Value Evaluation
  // ---------------------------------------------------------------------------

  async _eval(block) {
    if (!block || this._isAborted()) return 0;

    switch (block.type) {
      // Literals
      case 'math_number': {
        return parseFloat(block.getFieldValue('NUM') || '0');
      }

      case 'logic_boolean': {
        return block.getFieldValue('BOOL') === 'TRUE';
      }

      case 'logic_null': {
        return null;
      }

      case 'text': {
        return block.getFieldValue('TEXT') || '';
      }

      // Variables
      case 'variables_get': {
        const varName = block.getFieldValue('VAR');
        return this.variables.has(varName) ? this.variables.get(varName) : 0;
      }

      // Math Operations
      case 'math_arithmetic': {
        const op = block.getFieldValue('OP') || 'ADD';
        const a = Number(await this._eval(block.getInputTargetBlock('A')));
        const b = Number(await this._eval(block.getInputTargetBlock('B')));

        switch (op) {
          case 'ADD': return a + b;
          case 'MINUS': return a - b;
          case 'MULTIPLY': return a * b;
          case 'DIVIDE': return b !== 0 ? a / b : 0;
          case 'POWER': return Math.pow(a, b);
          default: return a + b;
        }
      }

      case 'math_single': {
        const op = block.getFieldValue('OP');
        const n = Number(await this._eval(block.getInputTargetBlock('NUM')));

        switch (op) {
          case 'ROOT': return Math.sqrt(n);
          case 'ABS': return Math.abs(n);
          case 'NEG': return -n;
          case 'LN': return Math.log(n);
          case 'EXP': return Math.exp(n);
          case 'POW10': return Math.pow(10, n);
          case 'ROUND': return Math.round(n);
          case 'ROUNDUP': return Math.ceil(n);
          case 'ROUNDDOWN': return Math.floor(n);
          case 'SIN': return Math.sin(n * Math.PI / 180.0);
          case 'COS': return Math.cos(n * Math.PI / 180.0);
          case 'TAN': return Math.tan(n * Math.PI / 180.0);
          default: return n;
        }
      }

      case 'math_modulo': {
        const dividend = Number(await this._eval(block.getInputTargetBlock('DIVIDEND')));
        const divisor = Number(await this._eval(block.getInputTargetBlock('DIVISOR')));
        return divisor !== 0 ? dividend % divisor : 0;
      }

      case 'math_constrain': {
        const val = Number(await this._eval(block.getInputTargetBlock('VALUE')));
        const low = Number(await this._eval(block.getInputTargetBlock('LOW')));
        const high = Number(await this._eval(block.getInputTargetBlock('HIGH')));
        return this.engine.constrain(val, low, high);
      }

      case 'math_min': {
        const a = Number(await this._eval(block.getInputTargetBlock('A')));
        const b = Number(await this._eval(block.getInputTargetBlock('B')));
        return Math.min(a, b);
      }

      case 'math_sqrt': {
        return Math.sqrt(Number(await this._eval(block.getInputTargetBlock('NUM'))));
      }

      case 'math_round': {
        return Math.round(Number(await this._eval(block.getInputTargetBlock('NUM'))));
      }

      case 'math_pi': {
        return Math.PI;
      }

      case 'math_is_even': {
        const n = Number(await this._eval(block.getInputTargetBlock('NUM')));
        return n % 2 === 0;
      }

      case 'math_map': {
        const val = Number(await this._eval(block.getInputTargetBlock('VALUE')));
        const fl = Number(block.getFieldValue('FROM_LOW') || '0');
        const fh = Number(block.getFieldValue('FROM_HIGH') || '1023');
        const tl = Number(block.getFieldValue('TO_LOW') || '0');
        const th = Number(block.getFieldValue('TO_HIGH') || '255');
        return Math.round(this.engine.mapVal(val, fl, fh, tl, th));
      }

      case 'math_map_advanced': {
        const val = Number(await this._eval(block.getInputTargetBlock('VALUE')));
        const fl = Number(await this._eval(block.getInputTargetBlock('FROM_LOW')));
        const fh = Number(await this._eval(block.getInputTargetBlock('FROM_HIGH')));
        const tl = Number(await this._eval(block.getInputTargetBlock('TO_LOW')));
        const th = Number(await this._eval(block.getInputTargetBlock('TO_HIGH')));
        return Math.round(this.engine.mapVal(val, fl, fh, tl, th));
      }

      case 'math_random_int': {
        const from = Number(await this._eval(block.getInputTargetBlock('FROM')));
        const to = Number(await this._eval(block.getInputTargetBlock('TO')));
        return this.engine.random(from, to + 1);
      }

      case 'math_random_float': {
        return Math.random();
      }

      case 'math_bit_read': {
        const num = Number(await this._eval(block.getInputTargetBlock('NUM')));
        const bit = Number(await this._eval(block.getInputTargetBlock('BIT')));
        return (num >> bit) & 1;
      }

      // Logic Operations
      case 'logic_compare': {
        const op = block.getFieldValue('OP') || 'EQ';
        const a = await this._eval(block.getInputTargetBlock('A'));
        const b = await this._eval(block.getInputTargetBlock('B'));

        switch (op) {
          case 'EQ': return a == b;
          case 'NEQ': return a != b;
          case 'LT': return Number(a) < Number(b);
          case 'LTE': return Number(a) <= Number(b);
          case 'GT': return Number(a) > Number(b);
          case 'GTE': return Number(a) >= Number(b);
          default: return a == b;
        }
      }

      case 'logic_operation': {
        const op = block.getFieldValue('OP');
        const a = Boolean(await this._eval(block.getInputTargetBlock('A')));
        const b = Boolean(await this._eval(block.getInputTargetBlock('B')));
        return op === 'AND' ? (a && b) : (a || b);
      }

      case 'logic_negate': {
        const b = Boolean(await this._eval(block.getInputTargetBlock('BOOL')));
        return !b;
      }

      // Text / String Operations
      case 'text_join': {
        const count = block.itemCount_ || 0;
        let result = '';
        for (let i = 0; i < count; i++) {
          const itemBlock = block.getInputTargetBlock('ADD' + i);
          if (itemBlock) {
            result += String(await this._eval(itemBlock));
          }
        }
        return result;
      }

      case 'text_length': {
        const str = String(await this._eval(block.getInputTargetBlock('VALUE')));
        return str.length;
      }

      case 'string_create': {
        return String(await this._eval(block.getInputTargetBlock('VALUE')));
      }

      case 'string_append': {
        const str = String(await this._eval(block.getInputTargetBlock('STRING')));
        const val = String(await this._eval(block.getInputTargetBlock('VALUE')));
        return str + val;
      }

      case 'string_find': {
        const str = String(await this._eval(block.getInputTargetBlock('STRING')));
        const sub = String(await this._eval(block.getInputTargetBlock('SUBSTRING')));
        return str.indexOf(sub);
      }

      case 'string_substring': {
        const str = String(await this._eval(block.getInputTargetBlock('STRING')));
        const start = Number(await this._eval(block.getInputTargetBlock('START')));
        const end = Number(await this._eval(block.getInputTargetBlock('END')));
        return str.substring(start, end);
      }

      case 'string_trim': {
        const str = String(await this._eval(block.getInputTargetBlock('STRING')));
        return str.trim();
      }

      case 'string_to_upper': {
        const str = String(await this._eval(block.getInputTargetBlock('STRING')));
        return str.toUpperCase();
      }

      case 'string_to_int': {
        const str = String(await this._eval(block.getInputTargetBlock('STRING')));
        return parseInt(str, 10) || 0;
      }

      case 'string_starts_with': {
        const str = String(await this._eval(block.getInputTargetBlock('STRING')));
        const prefix = String(await this._eval(block.getInputTargetBlock('PREFIX')));
        return str.startsWith(prefix);
      }

      // Arduino Hardware Inputs
      case 'digital_read': {
        const pin = block.getFieldValue('PIN');
        return this.engine.digitalRead(pin);
      }

      case 'analog_read': {
        const pin = block.getFieldValue('PIN');
        return this.engine.analogRead(pin);
      }

      case 'potentiometer': {
        const pin = block.getFieldValue('PIN') || 'A0';
        return this.engine.analogRead(pin);
      }

      case 'light_sensor':
      case 'light_sensor_raw': {
        const pin = block.getFieldValue('PIN') || 'A0';
        return this.engine.analogRead(pin);
      }

      case 'sensor_temp': {
        const unit = block.getFieldValue('UNIT') || 'C';
        const tempC = 25.0 + Math.sin(Date.now() / 5000) * 2;
        return unit === 'F' ? (tempC * 9 / 5 + 32) : tempC;
      }

      case 'dht_read_temp': {
        const unit = block.getFieldValue('UNIT') || 'C';
        return this.engine.readDHT(2, unit).temperature;
      }

      case 'dht_read_humidity': {
        return this.engine.readDHT(2).humidity;
      }

      case 'pir_read_motion': {
        const pin = block.getFieldValue('PIN');
        return this.engine.readPIR(pin);
      }

      case 'ldr_read_level': {
        const pin = block.getFieldValue('PIN') || 'A0';
        const isPercent = block.getFieldValue('UNIT') === 'PERCENT';
        return this.engine.readLDR(pin, isPercent);
      }

      case 'mq2_read_gas': {
        const pin = block.getFieldValue('PIN') || 'A0';
        const isDigital = block.getFieldValue('MODE') === 'DIGITAL';
        return this.engine.readGas(pin, isDigital);
      }

      case 'ntc_read_temp': {
        const pin = block.getFieldValue('PIN') || 'A0';
        const unit = block.getFieldValue('UNIT') || 'C';
        return this.engine.readNTC(pin, unit);
      }

      case 'ds18b20_read_temp': {
        const pin = block.getFieldValue('PIN') || '2';
        const unit = block.getFieldValue('UNIT') || 'C';
        return this.engine.readDS18B20(pin, unit);
      }

      case 'bmp180_read_pressure': {
        return this.engine.readBMP180('pressure');
      }

      case 'bmp180_read_temp': {
        return this.engine.readBMP180('temperature');
      }

      case 'bmp180_read_altitude': {
        return this.engine.readBMP180('altitude');
      }

      case 'hx711_read_weight': {
        const unit = block.getFieldValue('UNIT') || 'G';
        return this.engine.readHX711(unit);
      }

      case 'mfrc522_card_present': {
        return this.engine.readMFRC522('card_present');
      }

      case 'mfrc522_read_uid': {
        return this.engine.readMFRC522('uid');
      }

      case 'joystick_read': {
        const pin = block.getFieldValue('PIN') || 'A0';
        const axis = block.getFieldValue('AXIS') || 'X';
        return this.engine.readJoystick(pin, axis);
      }

      case 'rtc_get': {
        const field = block.getFieldValue('FIELD') || 'HOUR';
        return this.engine.readRTC(field);
      }

      case 'rtc_year': {
        return this.engine.readRTC('YEAR');
      }

      case 'ultrasonic_read': {
        // Mock distance 15-50 cm
        return 24 + Math.round(Math.sin(Date.now() / 2000) * 10);
      }

      case 'millis': {
        return this.engine.millis();
      }

      case 'servo_read': {
        const name = block.getFieldValue('NAME') || 'myServo';
        const servo = this.engine.servoNameMap.get(name);
        return (servo && servo.element && servo.element.angle !== undefined) ? servo.element.angle : 90;
      }

      case 'procedures_callreturn': {
        const fnName = block.getFieldValue('NAME');
        const defBlock = this.functions.get(fnName);
        if (defBlock) {
          const stackBlock = defBlock.getInputTargetBlock('STACK');
          if (stackBlock) await this._runSequence(stackBlock);
          const retBlock = defBlock.getInputTargetBlock('RETURN');
          return retBlock ? await this._eval(retBlock) : 0;
        }
        return 0;
      }

      default:
        return 0;
    }
  }
}

// Export to window
if (typeof window !== 'undefined') {
  window.SimRunner = SimRunner;
}
if (typeof module !== 'undefined') {
  module.exports = SimRunner;
}
