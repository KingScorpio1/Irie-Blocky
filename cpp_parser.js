// Intelligent C++ Arduino Code to Blockly Parser
function parseCppCode(code, workspace) {
  if (!workspace) return;
  if (!code || !code.trim()) {
    throw new Error('Please provide Arduino C++ code to parse.');
  }

  // Clear existing workspace
  workspace.clear();

  // Create standard Arduino Setup and Loop blocks
  const setupBlock = workspace.newBlock('arduino_setup');
  setupBlock.initSvg();
  setupBlock.render();
  setupBlock.moveBy(50, 40);

  const loopBlock = workspace.newBlock('arduino_loop');
  loopBlock.initSvg();
  loopBlock.render();
  loopBlock.moveBy(50, 320);

  // Helper to extract function body between curly braces
  function extractFunctionBody(source, funcName) {
    const regex = new RegExp(`void\\s+${funcName}\\s*\\(\\s*\\)\\s*\\{`, 'i');
    const match = regex.exec(source);
    if (!match) return '';
    const startIndex = match.index + match[0].length;
    let braceCount = 1;
    let endIndex = startIndex;
    while (endIndex < source.length && braceCount > 0) {
      if (source[endIndex] === '{') braceCount++;
      else if (source[endIndex] === '}') braceCount--;
      endIndex++;
    }
    return source.substring(startIndex, endIndex - 1);
  }

  // Parse a block of statements into an array of Blockly statement blocks
  function parseStatements(body) {
    if (!body) return [];

    // Remove single-line comments and multi-line comments
    const cleanBody = body
      .replace(/\/\/[^\n\r]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');

    // Split by semicolons
    const rawStmts = cleanBody
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const blocks = [];

    for (const stmt of rawStmts) {
      let m;

      // Serial.begin(baud)
      if ((m = stmt.match(/Serial\.begin\s*\(\s*(\d+)\s*\)/i))) {
        const blk = workspace.newBlock('serial_begin');
        blk.setFieldValue(Number(m[1]), 'BAUD');
        blocks.push(blk);
      }
      // LED_BUILTIN write
      else if ((m = stmt.match(/digitalWrite\s*\(\s*LED_BUILTIN\s*,\s*(HIGH|LOW)\s*\)/i))) {
        const blk = workspace.newBlock('led_write');
        blk.setFieldValue(m[1].toUpperCase(), 'STATE');
        blocks.push(blk);
      }
      // digitalWrite(pin, HIGH/LOW)
      else if ((m = stmt.match(/digitalWrite\s*\(\s*(\d+)\s*,\s*(HIGH|LOW)\s*\)/i))) {
        const blk = workspace.newBlock('digital_write');
        blk.setFieldValue(Number(m[1]), 'PIN');
        blk.setFieldValue(m[2].toUpperCase(), 'STATE');
        blocks.push(blk);
      }
      // analogWrite(pin, val) / pwm
      else if ((m = stmt.match(/analogWrite\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/i))) {
        const blk = workspace.newBlock('pwm_write');
        blk.setFieldValue(Number(m[1]), 'PIN');
        blk.setFieldValue(Number(m[2]), 'VALUE');
        blocks.push(blk);
      }
      // delay(ms)
      else if ((m = stmt.match(/delay\s*\(\s*(\d+)\s*\)/i))) {
        const blk = workspace.newBlock('delay_ms');
        blk.setFieldValue(Number(m[1]), 'MS');
        blocks.push(blk);
      }
      // tone(pin, freq)
      else if ((m = stmt.match(/tone\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/i))) {
        const blk = workspace.newBlock('tone_start');
        blk.setFieldValue(Number(m[1]), 'PIN');
        blk.setFieldValue(Number(m[2]), 'FREQ');
        blocks.push(blk);
      }
      // noTone(pin)
      else if ((m = stmt.match(/noTone\s*\(\s*(\d+)\s*\)/i))) {
        const blk = workspace.newBlock('tone_stop');
        blk.setFieldValue(Number(m[1]), 'PIN');
        blocks.push(blk);
      }
      // servo.attach(pin)
      else if ((m = stmt.match(/\w+\.attach\s*\(\s*(\d+)\s*\)/i))) {
        const blk = workspace.newBlock('servo_attach');
        blk.setFieldValue(Number(m[1]), 'PIN');
        blocks.push(blk);
      }
      // servo.write(angle)
      else if ((m = stmt.match(/\w+\.write\s*\(\s*(\d+)\s*\)/i))) {
        const blk = workspace.newBlock('servo_write');
        blk.setFieldValue(Number(m[1]), 'ANGLE');
        blocks.push(blk);
      }
      // move(dist)
      else if ((m = stmt.match(/move\s*\(\s*(-?\d+)\s*\)/i))) {
        const blk = workspace.newBlock('motion_move');
        blk.setFieldValue(Number(m[1]), 'DISTANCE');
        blocks.push(blk);
      }
      // pinMode(pin, OUTPUT/INPUT) is handled implicitly by generators, but can be accepted
    }

    return blocks;
  }

  // Connect blocks sequentially into a parent connection
  function attachBlockChain(parentConnection, blocks) {
    if (!blocks || blocks.length === 0 || !parentConnection) return;
    let currentConn = parentConnection;
    for (const blk of blocks) {
      blk.initSvg();
      blk.render();
      if (currentConn && blk.previousConnection) {
        currentConn.connect(blk.previousConnection);
        currentConn = blk.nextConnection;
      }
    }
  }

  const setupBody = extractFunctionBody(code, 'setup');
  const loopBody = extractFunctionBody(code, 'loop');

  const setupBlocks = parseStatements(setupBody);
  const loopBlocks = parseStatements(loopBody);

  const setupInput = setupBlock.getInput('SETUP_STATEMENTS');
  const loopInput = loopBlock.getInput('LOOP_STATEMENTS');

  if (setupInput && setupBlocks.length > 0) {
    attachBlockChain(setupInput.connection, setupBlocks);
  }

  if (loopInput && loopBlocks.length > 0) {
    attachBlockChain(loopInput.connection, loopBlocks);
  }

  return {
    setupCount: setupBlocks.length,
    loopCount: loopBlocks.length
  };
}
