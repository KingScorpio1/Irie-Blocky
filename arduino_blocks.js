function defineArduinoBlocks() {
      // Serial Communication
      Blockly.Blocks['serial_begin'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("Serial begin")
              .appendField(new Blockly.FieldNumber(9600, 300, 115200), "BAUD");
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(200);
          this.setTooltip("Initialize serial communication");
        }
      };

      // Delay Block
      Blockly.Blocks['delay_ms'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("delay")
              .appendField(new Blockly.FieldNumber(1000, 0, 60000), "MS")
              .appendField("ms");
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(120);
          this.setTooltip("Pause execution for milliseconds");
        }
      };

      // Wait Milliseconds
      Blockly.Blocks['wait_ms'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("wait")
              .appendField(new Blockly.FieldNumber(1000, 0, 60000), "MS")
              .appendField("ms");
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(160);
          this.setTooltip("Wait for specified milliseconds");
        }
      };

      // Get Milliseconds
      Blockly.Blocks['millis'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("run time (ms)");
          this.setOutput(true, "Number");
          this.setColour(160);
          this.setTooltip("Get current time in milliseconds since program start");
        }
      };

      // Wait Forever
      Blockly.Blocks['wait_forever'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("wait forever");
          this.setPreviousStatement(true, null);
          this.setNextStatement(false);
          this.setColour(160);
          this.setTooltip("Halt program execution indefinitely");
        }
      };

      // Setup Block
      Blockly.Blocks['arduino_setup'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("Setup");
          this.appendStatementInput("SETUP_STATEMENTS")
              .setCheck(null);
          this.setColour(120);
          this.setTooltip("Arduino setup function");
          this.setDeletable(false);
        }
      };

      // Loop Block
      Blockly.Blocks['arduino_loop'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("Loop");
          this.appendStatementInput("LOOP_STATEMENTS")
              .setCheck(null);
          this.setColour(120);
          this.setTooltip("Arduino main loop");
          this.setDeletable(false);
        }
      };

      // Digital Write
      Blockly.Blocks['digital_write'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("set digital pin")
              .appendField(new Blockly.FieldNumber(2, 0, 53), "PIN")
              .appendField("to")
              .appendField(new Blockly.FieldDropdown([["HIGH","HIGH"], ["LOW","LOW"]]), "STATE");
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(160);
          this.setTooltip("Set a digital pin HIGH or LOW");
        }
      };

      // PWM Write
      Blockly.Blocks['pwm_write'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("set PWM pin")
              .appendField(new Blockly.FieldNumber(3, 0, 13), "PIN")
              .appendField("to")
              .appendField(new Blockly.FieldNumber(0, 0, 255), "VALUE");
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(160);
          this.setTooltip("Write PWM value (0-255) to pin");
        }
      };

      // Digital Read
      Blockly.Blocks['digital_read'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("digital read pin")
              .appendField(new Blockly.FieldNumber(2, 0, 53), "PIN");
          this.setOutput(true, "Boolean");
          this.setColour(160);
          this.setTooltip("Read digital pin state");
        }
      };

      // Analog Read
      Blockly.Blocks['analog_read'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("analog read pin")
              .appendField(new Blockly.FieldDropdown([
                ["A0","A0"], ["A1","A1"], ["A2","A2"], 
                ["A3","A3"], ["A4","A4"], ["A5","A5"]
              ]), "PIN");
          this.setOutput(true, "Number");
          this.setColour(160);
          this.setTooltip("Read analog pin (0-1023)");
        }
      };

      // LED Control
      Blockly.Blocks['led_write'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("set built-in LED to")
              .appendField(new Blockly.FieldDropdown([["HIGH","HIGH"], ["LOW","LOW"]]), "STATE");
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(160);
          this.setTooltip("Control the built-in board LED");
        }
      };

      // Tone Generation
      Blockly.Blocks['tone_start'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("play tone on pin")
              .appendField(new Blockly.FieldNumber(8, 0, 53), "PIN")
              .appendField("frequency")
              .appendField(new Blockly.FieldNumber(440, 31, 32767), "FREQ")
              .appendField("Hz");
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(160);
          this.setTooltip("Generate tone on pin");
        }
      };

      Blockly.Blocks['tone_stop'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("stop tone on pin")
              .appendField(new Blockly.FieldNumber(8, 0, 53), "PIN");
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(160);
          this.setTooltip("Stop tone generation");
        }
      };

      // Temperature Sensor
      Blockly.Blocks['sensor_temp'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("temperature sensor")
              .appendField(new Blockly.FieldDropdown([
                ["Celsius","C"], 
                ["Fahrenheit","F"]
              ]), "UNIT");
          this.setOutput(true, "Number");
          this.setColour(160);
          this.setTooltip("Read temperature sensor value");
        }
      };

      // Light Sensor
      Blockly.Blocks['light_sensor'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("light sensor light on pin")
              .appendField(new Blockly.FieldDropdown([
                ["A0","A0"], ["A1","A1"], ["A2","A2"], 
                ["A3","A3"], ["A4","A4"], ["A5","A5"]
              ]), "PIN");
          this.setOutput(true, "Number");
          this.setColour(160);
          this.setTooltip("Read light level from sensor (0-1023)");
        }
      };

      Blockly.Blocks['light_sensor_raw'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("light sensor on pin")
              .appendField(new Blockly.FieldDropdown([
                ["A0","A0"], ["A1","A1"], ["A2","A2"], 
                ["A3","A3"], ["A4","A4"], ["A5","A5"]
              ]), "PIN");
          this.setOutput(true, "Number");
          this.setColour(160);
          this.setTooltip("Read raw light sensor value");
        }
      };

      // Potentiometer
      Blockly.Blocks['potentiometer'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("potentiometer on pin")
              .appendField(new Blockly.FieldDropdown([
                ["A0","A0"], ["A1","A1"], ["A2","A2"], 
                ["A3","A3"], ["A4","A4"], ["A5","A5"]
              ]), "PIN");
          this.setOutput(true, "Number");
          this.setColour(160);
          this.setTooltip("Read potentiometer value (0-1023)");
        }
      };

      // Ultrasonic Sensor
      Blockly.Blocks['ultrasonic_add'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("add my sense trig")
              .appendField(new Blockly.FieldNumber(2, 0, 53), "TRIG")
              .appendField("echo")
              .appendField(new Blockly.FieldNumber(3, 0, 53), "ECHO");
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(160);
          this.setTooltip("Initialize ultrasonic sensor with trigger and echo pins");
        }
      };

      Blockly.Blocks['ultrasonic_read'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("run distance from my sensor");
          this.setOutput(true, "Number");
          this.setColour(160);
          this.setTooltip("Get distance reading from ultrasonic sensor in cm");
        }
      };

      // Encoder
      Blockly.Blocks['encoder_add'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("add encoder")
              .appendField(new Blockly.FieldTextInput("my_encoder"), "NAME")
              .appendField("clock")
              .appendField(new Blockly.FieldNumber(2, 0, 53), "CLK")
              .appendField("data")
              .appendField(new Blockly.FieldNumber(3, 0, 53), "DATA");
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(160);
          this.setTooltip("Initialize rotary encoder with clock and data pins");
        }
      };

      Blockly.Blocks['encoder_read'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("read encoder")
              .appendField(new Blockly.FieldTextInput("my_encoder"), "NAME");
          this.setOutput(true, "Number");
          this.setColour(160);
          this.setTooltip("Read current value from encoder");
        }
      };

      Blockly.Blocks['encoder_write'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("write encoder")
              .appendField(new Blockly.FieldTextInput("my_encoder"), "NAME")
              .appendField("value")
              .appendField(new Blockly.FieldNumber(0, -2147483648, 2147483647), "VALUE");
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(160);
          this.setTooltip("Set encoder value");
        }
      };

      // Color Sensor (TCS34725)
      Blockly.Blocks['color_sensor_color'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("sense color");
          this.setOutput(true, "Number");
          this.setColour(160);
          this.setTooltip("Read color value from sensor");
        }
      };

      Blockly.Blocks['color_sensor_brightness'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("sense brightness");
          this.setOutput(true, "Number");
          this.setColour(160);
          this.setTooltip("Read brightness from color sensor");
        }
      };

      Blockly.Blocks['color_sensor_lux'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("sense lux");
          this.setOutput(true, "Number");
          this.setColour(160);
          this.setTooltip("Read lux value from color sensor");
        }
      };

      Blockly.Blocks['color_sensor_temp'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("sense color temp");
          this.setOutput(true, "Number");
          this.setColour(160);
          this.setTooltip("Read color temperature from sensor");
        }
      };

      // Distance Sensor (VL5310X)
      Blockly.Blocks['distance_sensor_mm'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("mm range from laser sensor");
          this.setOutput(true, "Number");
          this.setColour(160);
          this.setTooltip("Get distance reading from laser sensor in mm");
        }
      };

      // Accelerometer and Gyroscope (MPU6050)
      Blockly.Blocks['mpu6050_accel'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("Real acceleration to")
              .appendField(new Blockly.FieldDropdown([
                ["x","x"], ["y","y"], ["z","z"]
              ]), "AXIS");
          this.setOutput(true, "Number");
          this.setColour(160);
          this.setTooltip("Read acceleration from MPU6050");
        }
      };

      Blockly.Blocks['mpu6050_gyro'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("Real gyroscope to")
              .appendField(new Blockly.FieldDropdown([
                ["x","x"], ["y","y"], ["z","z"]
              ]), "AXIS");
          this.setOutput(true, "Number");
          this.setColour(160);
          this.setTooltip("Read gyroscope value from MPU6050");
        }
      };

      // Real Time Clock (RTC)
      Blockly.Blocks['rtc_add'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("add RTC")
              .appendField(new Blockly.FieldDropdown([
                ["DS1307","DS1307"], ["DS3231","DS3231"]
              ]), "MODEL");
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(160);
          this.setTooltip("Initialize RTC module");
        }
      };

      Blockly.Blocks['rtc_year'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("RTC year");
          this.setOutput(true, "Number");
          this.setColour(160);
          this.setTooltip("Get current year from RTC");
        }
      };

      Blockly.Blocks['rtc_get'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("RTC")
              .appendField(new Blockly.FieldDropdown([
                ["hour", "HOUR"],
                ["minute", "MINUTE"],
                ["second", "SECOND"],
                ["day", "DAY"],
                ["month", "MONTH"],
                ["year", "YEAR"]
              ]), "FIELD");
          this.setOutput(true, "Number");
          this.setColour(160);
          this.setTooltip("Read time or date component from RTC");
        }
      };

      // DHT22 / DHT11 Temperature & Humidity Sensor
      Blockly.Blocks['dht_init'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("setup DHT sensor on pin")
              .appendField(new Blockly.FieldNumber(2, 0, 53), "PIN")
              .appendField("model")
              .appendField(new Blockly.FieldDropdown([
                ["DHT22", "DHT22"],
                ["DHT11", "DHT11"]
              ]), "MODEL");
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(160);
          this.setTooltip("Initialize DHT temperature and humidity sensor");
        }
      };

      Blockly.Blocks['dht_read_temp'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("read DHT temperature")
              .appendField(new Blockly.FieldDropdown([
                ["°C", "C"],
                ["°F", "F"]
              ]), "UNIT");
          this.setOutput(true, "Number");
          this.setColour(160);
          this.setTooltip("Read temperature from DHT sensor");
        }
      };

      Blockly.Blocks['dht_read_humidity'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("read DHT relative humidity (%)");
          this.setOutput(true, "Number");
          this.setColour(160);
          this.setTooltip("Read humidity percentage from DHT sensor");
        }
      };

      // PIR Motion Sensor
      Blockly.Blocks['pir_read_motion'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("PIR motion detected on pin")
              .appendField(new Blockly.FieldNumber(2, 0, 53), "PIN");
          this.setOutput(true, "Boolean");
          this.setColour(160);
          this.setTooltip("Returns true if motion detected by PIR sensor");
        }
      };

      // Photoresistor (LDR) Sensor
      Blockly.Blocks['ldr_read_level'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("read light (LDR) on pin")
              .appendField(new Blockly.FieldDropdown([
                ["A0", "A0"], ["A1", "A1"], ["A2", "A2"], ["A3", "A3"], ["A4", "A4"], ["A5", "A5"]
              ]), "PIN")
              .appendField("as")
              .appendField(new Blockly.FieldDropdown([
                ["0-100%", "PERCENT"],
                ["raw (0-1023)", "RAW"]
              ]), "UNIT");
          this.setOutput(true, "Number");
          this.setColour(160);
          this.setTooltip("Read ambient light level from Photoresistor");
        }
      };

      // MQ2 Gas Sensor
      Blockly.Blocks['mq2_read_gas'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("read MQ2 gas on pin")
              .appendField(new Blockly.FieldDropdown([
                ["A0", "A0"], ["A1", "A1"], ["A2", "A2"], ["A3", "A3"], ["A4", "A4"], ["A5", "A5"],
                ["D2", "2"], ["D3", "3"], ["D4", "4"]
              ]), "PIN")
              .appendField("type")
              .appendField(new Blockly.FieldDropdown([
                ["analog level", "ANALOG"],
                ["digital threshold", "DIGITAL"]
              ]), "MODE");
          this.setOutput(true, "Number");
          this.setColour(160);
          this.setTooltip("Read combustible gas concentration from MQ2 sensor");
        }
      };

      // NTC Analog Thermistor
      Blockly.Blocks['ntc_read_temp'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("read NTC temperature on pin")
              .appendField(new Blockly.FieldDropdown([
                ["A0", "A0"], ["A1", "A1"], ["A2", "A2"], ["A3", "A3"], ["A4", "A4"], ["A5", "A5"]
              ]), "PIN")
              .appendField("in")
              .appendField(new Blockly.FieldDropdown([
                ["°C", "C"],
                ["°F", "F"]
              ]), "UNIT");
          this.setOutput(true, "Number");
          this.setColour(160);
          this.setTooltip("Read temperature from NTC analog thermistor");
        }
      };

      // DS18B20 One-Wire Digital Temperature Sensor
      Blockly.Blocks['ds18b20_read_temp'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("read DS18B20 temperature on pin")
              .appendField(new Blockly.FieldNumber(2, 0, 53), "PIN")
              .appendField("in")
              .appendField(new Blockly.FieldDropdown([
                ["°C", "C"],
                ["°F", "F"]
              ]), "UNIT");
          this.setOutput(true, "Number");
          this.setColour(160);
          this.setTooltip("Read accurate digital temperature via One-Wire DS18B20");
        }
      };

      // BMP180 Barometric Pressure Sensor
      Blockly.Blocks['bmp180_read_pressure'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("BMP180 barometric pressure (hPa)");
          this.setOutput(true, "Number");
          this.setColour(160);
          this.setTooltip("Read atmospheric pressure from BMP180 I2C sensor");
        }
      };

      Blockly.Blocks['bmp180_read_temp'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("BMP180 temperature (°C)");
          this.setOutput(true, "Number");
          this.setColour(160);
          this.setTooltip("Read temperature from BMP180 sensor");
        }
      };

      Blockly.Blocks['bmp180_read_altitude'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("BMP180 altitude (meters)");
          this.setOutput(true, "Number");
          this.setColour(160);
          this.setTooltip("Calculate altitude based on barometric pressure");
        }
      };

      // HX711 Load Cell Amplifier
      Blockly.Blocks['hx711_init'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("setup HX711 Load Cell DT")
              .appendField(new Blockly.FieldNumber(2, 0, 53), "DOUT")
              .appendField("SCK")
              .appendField(new Blockly.FieldNumber(3, 0, 53), "SCK");
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(160);
          this.setTooltip("Initialize HX711 load cell weight amplifier");
        }
      };

      Blockly.Blocks['hx711_read_weight'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("read HX711 weight in")
              .appendField(new Blockly.FieldDropdown([
                ["grams (g)", "G"],
                ["kilograms (kg)", "KG"]
              ]), "UNIT");
          this.setOutput(true, "Number");
          this.setColour(160);
          this.setTooltip("Read weight measurement from HX711 load cell");
        }
      };

      // MFRC522 RFID / NFC Reader
      Blockly.Blocks['mfrc522_init'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("setup MFRC522 RFID SS pin")
              .appendField(new Blockly.FieldNumber(10, 0, 53), "SS")
              .appendField("RST pin")
              .appendField(new Blockly.FieldNumber(9, 0, 53), "RST");
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(160);
          this.setTooltip("Initialize MFRC522 SPI RFID reader");
        }
      };

      Blockly.Blocks['mfrc522_card_present'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("RFID card detected?");
          this.setOutput(true, "Boolean");
          this.setColour(160);
          this.setTooltip("Returns true if an RFID/NFC tag or card is present");
        }
      };

      Blockly.Blocks['mfrc522_read_uid'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("read RFID card UID");
          this.setOutput(true, "String");
          this.setColour(160);
          this.setTooltip("Read unique identifier from detected RFID card");
        }
      };

      // Analog Joystick
      Blockly.Blocks['joystick_read'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("read Joystick")
              .appendField(new Blockly.FieldDropdown([
                ["X-Axis", "X"],
                ["Y-Axis", "Y"],
                ["Button Pressed?", "BTN"]
              ]), "AXIS")
              .appendField("on pin")
              .appendField(new Blockly.FieldDropdown([
                ["A0", "A0"], ["A1", "A1"], ["A2", "A2"], ["A3", "A3"],
                ["D2", "2"], ["D3", "3"], ["D4", "4"]
              ]), "PIN");
          this.setOutput(true, "Number");
          this.setColour(160);
          this.setTooltip("Read 2-axis joystick position or button state");
        }
      };

      // Motion
      Blockly.Blocks['motion_move'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("move")
              .appendField(new Blockly.FieldNumber(10, -100, 100), "DISTANCE")
              .appendField("cm");
          this.setPreviousStatement(true);
          this.setNextStatement(true);
          this.setColour(120);
          this.setTooltip("Move a set distance");
        }
      };
      // Servo Motors
      Blockly.Blocks['servo_attach'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("attach servo")
              .appendField(new Blockly.FieldTextInput("my_servo"), "NAME")
              .appendField("on pin")
              .appendField(new Blockly.FieldNumber(9, 0, 53, 1), "PIN");
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(160);
          this.setTooltip("Attach a servo motor to a pin");
        }
      };

      Blockly.Blocks['servo_detach'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("detach servo")
              .appendField(new Blockly.FieldTextInput("my_servo"), "NAME");
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(160);
          this.setTooltip("Detach a servo motor");
        }
      };

      Blockly.Blocks['servo_write'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("set servo")
              .appendField(new Blockly.FieldTextInput("my_servo"), "NAME")
              .appendField("to angle")
              .appendField(new Blockly.FieldNumber(90, 0, 180, 1), "ANGLE");
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(160);
          this.setTooltip("Set servo angle (0-180 degrees)");
        }
      };

      Blockly.Blocks['servo_read'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("servo")
              .appendField(new Blockly.FieldTextInput("my_servo"), "NAME")
              .appendField("angle");
          this.setOutput(true, "Number");
          this.setColour(160);
          this.setTooltip("Read current servo angle");
        }
      };

      // Stepper Motors
      Blockly.Blocks['stepper_create_2pin'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("add stepper")
              .appendField(new Blockly.FieldTextInput("my_stepper"), "NAME")
              .appendField("with")
              .appendField(new Blockly.FieldNumber(200, 1, 1000, 1), "STEPS")
              .appendField("steps on pins")
              .appendField(new Blockly.FieldNumber(8, 0, 53, 1), "PIN1")
              .appendField(new Blockly.FieldNumber(9, 0, 53, 1), "PIN2");
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(160);
          this.setTooltip("Create a 2-pin stepper motor controller");
        }
      };

      Blockly.Blocks['stepper_create_4pin'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("add stepper")
              .appendField(new Blockly.FieldTextInput("my_stepper"), "NAME")
              .appendField("with")
              .appendField(new Blockly.FieldNumber(200, 1, 1000, 1), "STEPS")
              .appendField("steps on pins")
              .appendField(new Blockly.FieldNumber(8, 0, 53, 1), "PIN1")
              .appendField(new Blockly.FieldNumber(9, 0, 53, 1), "PIN2")
              .appendField(new Blockly.FieldNumber(10, 0, 53, 1), "PIN3")
              .appendField(new Blockly.FieldNumber(11, 0, 53, 1), "PIN4");
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(160);
          this.setTooltip("Create a 4-pin stepper motor controller");
        }
      };

      Blockly.Blocks['stepper_set_speed'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("set stepper")
              .appendField(new Blockly.FieldTextInput("my_stepper"), "NAME")
              .appendField("speed to")
              .appendField(new Blockly.FieldNumber(60, 1, 200, 1), "RPM")
              .appendField("rpm");
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(160);
          this.setTooltip("Set stepper motor speed in RPM");
        }
      };

      Blockly.Blocks['stepper_step'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("stepper")
              .appendField(new Blockly.FieldTextInput("my_stepper"), "NAME")
              .appendField(new Blockly.FieldNumber(200, -1000, 1000, 1), "STEPS")
              .appendField("steps");
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(160);
          this.setTooltip("Move stepper motor a number of steps");
        }
      };

      // DC Motors (L298N)
      Blockly.Blocks['l298n_attach'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("attach L298N")
              .appendField(new Blockly.FieldTextInput("my_L298N"), "NAME")
              .appendField("ENA")
              .appendField(new Blockly.FieldNumber(3, 0, 53, 1), "ENA")
              .appendField("IN1")
              .appendField(new Blockly.FieldNumber(4, 0, 53, 1), "IN1")
              .appendField("IN2")
              .appendField(new Blockly.FieldNumber(5, 0, 53, 1), "IN2")
              .appendField("IN3")
              .appendField(new Blockly.FieldNumber(6, 0, 53, 1), "IN3")
              .appendField("IN4")
              .appendField(new Blockly.FieldNumber(7, 0, 53, 1), "IN4");
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(160);
          this.setTooltip("Attach L298N motor controller with pin connections");
        }
      };

      Blockly.Blocks['l298n_set_direction'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("set L298N")
              .appendField(new Blockly.FieldTextInput("my_L298N"), "NAME")
              .appendField("motor")
              .appendField(new Blockly.FieldDropdown([["A","A"], ["B","B"]]), "MOTOR")
              .appendField("to")
              .appendField(new Blockly.FieldDropdown([
                ["forward","FORWARD"], 
                ["backward","BACKWARD"], 
                ["stop","STOP"]
              ]), "DIRECTION");
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(160);
          this.setTooltip("Set motor direction (forward, backward, or stop)");
        }
      };

      Blockly.Blocks['l298n_set_speed'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("set L298N")
              .appendField(new Blockly.FieldTextInput("my_L298N"), "NAME")
              .appendField("motor")
              .appendField(new Blockly.FieldDropdown([["A","A"], ["B","B"]]), "MOTOR")
              .appendField("speed to")
              .appendField(new Blockly.FieldNumber(255, 0, 255, 1), "SPEED");
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(160);
          this.setTooltip("Set motor speed (0-255)");
        }
      };

      // Map function
      Blockly.Blocks['math_map'] = {
        init: function() {
          this.appendValueInput("VALUE")
              .setCheck("Number")
              .appendField("map value");
          this.appendDummyInput()
              .appendField("from")
              .appendField(new Blockly.FieldNumber(0), "FROM_LOW")
              .appendField("to")
              .appendField(new Blockly.FieldNumber(1023), "FROM_HIGH");
          this.appendDummyInput()
              .appendField("to range")
              .appendField(new Blockly.FieldNumber(0), "TO_LOW")
              .appendField("to")
              .appendField(new Blockly.FieldNumber(255), "TO_HIGH");
          this.setOutput(true, "Number");
          this.setColour(230);
          this.setTooltip("Re-maps a number from one range to another");
        }
      };
      // Sine function
      Blockly.Blocks['math_sin'] = {
        init: function() {
          this.appendValueInput("ANGLE")
              .setCheck("Number")
              .appendField("sin");
          this.setOutput(true, "Number");
          this.setColour(230);
          this.setTooltip("Sine of an angle in degrees");
        }
      };

      // Pi constant
      Blockly.Blocks['math_pi'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("π");
          this.setOutput(true, "Number");
          this.setColour(230);
          this.setTooltip("The constant π (pi)");
        }
      };

      // Is Even
      Blockly.Blocks['math_is_even'] = {
        init: function() {
          this.appendValueInput("NUM")
              .setCheck("Number")
              .appendField("0 is even");
          this.setOutput(true, "Boolean");
          this.setColour(230);
          this.setTooltip("Returns true if the number is even");
        }
      };

      // Round
      Blockly.Blocks['math_round'] = {
        init: function() {
          this.appendValueInput("NUM")
              .setCheck("Number")
              .appendField("round");
          this.setOutput(true, "Number");
          this.setColour(230);
          this.setTooltip("Round a number to nearest integer");
        }
      };

      // Square Root
      Blockly.Blocks['math_sqrt'] = {
        init: function() {
          this.appendValueInput("NUM")
              .setCheck("Number")
              .appendField("square root");
          this.setOutput(true, "Number");
          this.setColour(230);
          this.setTooltip("Square root of a number");
        }
      };

      // Minimum
      Blockly.Blocks['math_min'] = {
        init: function() {
          this.appendValueInput("A")
              .setCheck("Number")
              .appendField("min of");
          this.appendValueInput("B")
              .setCheck("Number")
              .appendField("and");
          this.setOutput(true, "Number");
          this.setColour(230);
          this.setTooltip("Minimum of two numbers");
        }
      };

      // Modulo
      Blockly.Blocks['math_modulo'] = {
        init: function() {
          this.appendValueInput("DIVIDEND")
              .setCheck("Number")
              .appendField("remainder of");
          this.appendValueInput("DIVISOR")
              .setCheck("Number")
              .appendField("=");
          this.setOutput(true, "Number");
          this.setColour(230);
          this.setTooltip("Remainder after division");
        }
      };

      // Constrain
      Blockly.Blocks['math_constrain'] = {
        init: function() {
          this.appendValueInput("VALUE")
              .setCheck("Number")
              .appendField("constrain");
          this.appendValueInput("LOW")
              .setCheck("Number")
              .appendField("low");
          this.appendValueInput("HIGH")
              .setCheck("Number")
              .appendField("high");
          this.setOutput(true, "Number");
          this.setColour(230);
          this.setTooltip("Constrain a number between two values");
        }
      };

      // Advanced Map
      Blockly.Blocks['math_map_advanced'] = {
        init: function() {
          this.appendValueInput("VALUE")
              .setCheck("Number")
              .appendField("map");
          this.appendValueInput("FROM_LOW")
              .setCheck("Number")
              .appendField("from");
          this.appendValueInput("FROM_HIGH")
              .setCheck("Number")
              .appendField("to");
          this.appendValueInput("TO_LOW")
              .setCheck("Number")
              .appendField("to (");
          this.appendValueInput("TO_HIGH")
              .setCheck("Number")
              .appendField(")");
          this.setOutput(true, "Number");
          this.setColour(230);
          this.setTooltip("Re-map a number from one range to another");
        }
      };

      // Random Integer
      Blockly.Blocks['math_random_int'] = {
        init: function() {
          this.appendValueInput("FROM")
              .setCheck("Number")
              .appendField("random integer from");
          this.appendValueInput("TO")
              .setCheck("Number")
              .appendField("to (");
          this.appendDummyInput()
              .appendField(")");
          this.setOutput(true, "Number");
          this.setColour(230);
          this.setTooltip("Random integer between two values (inclusive)");
        }
      };

      // Random Float
      Blockly.Blocks['math_random_float'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("random fraction");
          this.setOutput(true, "Number");
          this.setColour(230);
          this.setTooltip("Random decimal between 0 and 1");
        }
      };

      // Bit Read
      Blockly.Blocks['math_bit_read'] = {
        init: function() {
          this.appendValueInput("NUM")
              .setCheck("Number")
              .appendField("bit value at position");
          this.appendValueInput("POS")
              .setCheck("Number")
              .appendField("in");
          this.setOutput(true, "Boolean");
          this.setColour(230);
          this.setTooltip("Read a bit at specified position");
        }
      };

      // Bit Clear
      Blockly.Blocks['math_bit_clear'] = {
        init: function() {
          this.appendValueInput("NUM")
              .setCheck("Number")
              .appendField("clear bit at position");
          this.appendValueInput("POS")
              .setCheck("Number")
              .appendField("in");
          this.setOutput(true, "Number");
          this.setColour(230);
          this.setTooltip("Clear a bit at specified position");
        }
      };

      // Bit Write
      Blockly.Blocks['math_bit_write'] = {
        init: function() {
          this.appendValueInput("NUM")
              .setCheck("Number")
              .appendField("write");
          this.appendValueInput("VALUE")
              .setCheck("Boolean")
              .appendField("to bit at position");
          this.appendValueInput("POS")
              .setCheck("Number")
              .appendField("in");
          this.setOutput(true, "Number");
          this.setColour(230);
          this.setTooltip("Write a bit at specified position");
        }
      };

      // High Byte
      Blockly.Blocks['math_high_byte'] = {
        init: function() {
          this.appendValueInput("NUM")
              .setCheck("Number")
              .appendField("high byte from");
          this.setOutput(true, "Number");
          this.setColour(230);
          this.setTooltip("Get the high byte of a number");
        }
      };
      // New Moving Average Filter
      Blockly.Blocks['signal_new_filter'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("new int moving average filter")
              .appendField(new Blockly.FieldTextInput("my_smoother"), "NAME")
              .appendField("size")
              .appendField(new Blockly.FieldNumber(10, 2, 100, 1), "SIZE");
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(230);
          this.setTooltip("Create a new moving average filter");
        }
      };

      // Add to Filter
      Blockly.Blocks['signal_add_to_filter'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("add to filter")
              .appendField(new Blockly.FieldTextInput("my_smoother"), "NAME");
          this.appendValueInput("VALUE")
              .setCheck("Number")
              .appendField("value");
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(230);
          this.setTooltip("Add a value to the moving average filter");
        }
      };

      // Get Filter Value
      Blockly.Blocks['signal_get_filter_value'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("get value from filter")
              .appendField(new Blockly.FieldTextInput("my_smoother"), "NAME");
          this.setOutput(true, "Number");
          this.setColour(230);
          this.setTooltip("Get current moving average value");
        }
      };
      // Character is alphabetical
      Blockly.Blocks['char_is_alpha'] = {
        init: function() {
          this.appendValueInput("CHAR")
              .setCheck("String")
              .appendField("char :")
              .appendField(new Blockly.FieldTextInput("A"), "CHAR")
              .appendField("is alphabetical");
          this.setOutput(true, "Boolean");
          this.setColour(160);
          this.setTooltip("Returns true if character is alphabetical");
        }
      };

      // String starts with
      Blockly.Blocks['string_starts_with'] = {
        init: function() {
          this.appendValueInput("STRING")
              .setCheck("String")
              .appendField(new Blockly.FieldTextInput("abc"), "STRING")
              .appendField("starts with");
          this.appendValueInput("PREFIX")
              .setCheck("String")
              .appendField(new Blockly.FieldTextInput("ab"), "PREFIX");
          this.setOutput(true, "Boolean");
          this.setColour(160);
          this.setTooltip("Returns true if string starts with prefix");
        }
      };

      // String to uppercase
      Blockly.Blocks['string_to_upper'] = {
        init: function() {
          this.appendValueInput("STRING")
              .setCheck("String")
              .appendField("to upper case")
              .appendField(new Blockly.FieldTextInput("abc"), "STRING");
          this.setOutput(true, "String");
          this.setColour(160);
          this.setTooltip("Convert string to uppercase");
        }
      };

      // String to integer
      Blockly.Blocks['string_to_int'] = {
        init: function() {
          this.appendValueInput("STRING")
              .setCheck("String")
              .appendField("to integer")
              .appendField(new Blockly.FieldTextInput("123"), "STRING");
          this.setOutput(true, "Number");
          this.setColour(160);
          this.setTooltip("Convert string to integer");
        }
      };

      // Create text with
      Blockly.Blocks['string_create'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("create text with");
          this.appendStatementInput("ITEMS")
              .setCheck(null);
          this.setOutput(true, "String");
          this.setColour(160);
          this.setTooltip("Create text from multiple items");
        }
      };

      // Append to string
      Blockly.Blocks['string_append'] = {
        init: function() {
          this.appendDummyInput()
              .appendField("to")
              .appendField(new Blockly.FieldVariable("myString"), "VAR")
              .appendField("append value");
          this.appendValueInput("VALUE")
              .setCheck(null);
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(160);
          this.setTooltip("Append value to a string variable");
        }
      };

      // Find in text
      Blockly.Blocks['string_find'] = {
        init: function() {
          this.appendValueInput("STRING")
              .setCheck("String")
              .appendField("in text")
              .appendField(new Blockly.FieldTextInput("abc"), "STRING")
              .appendField("find first occurrence of text");
          this.appendValueInput("SUBSTRING")
              .setCheck("String")
              .appendField(new Blockly.FieldTextInput("bc"), "SUBSTRING");
          this.setOutput(true, "Number");
          this.setColour(160);
          this.setTooltip("Find position of substring in string (-1 if not found)");
        }
      };

      // Substring
      Blockly.Blocks['string_substring'] = {
        init: function() {
          this.appendValueInput("STRING")
              .setCheck("String")
              .appendField("substring of")
              .appendField(new Blockly.FieldTextInput("abc"), "STRING")
              .appendField("from");
          this.appendValueInput("START")
              .setCheck("Number")
              .appendField(new Blockly.FieldNumber(0, 0, 100), "START")
              .appendField("to");
          this.appendValueInput("END")
              .setCheck("Number")
              .appendField(new Blockly.FieldNumber(1, 0, 100), "END");
          this.setOutput(true, "String");
          this.setColour(160);
          this.setTooltip("Extract substring from start to end position");
        }
      };

      // Trim spaces
      Blockly.Blocks['string_trim'] = {
        init: function() {
          this.appendValueInput("STRING")
              .setCheck("String")
              .appendField("trim spaces from both ends of")
              .appendField(new Blockly.FieldTextInput(" abc "), "STRING");
          this.setOutput(true, "String");
          this.setColour(160);
          this.setTooltip("Remove whitespace from both ends of string");
        }
      };

      // Replace in string
      Blockly.Blocks['string_replace'] = {
        init: function() {
          this.appendValueInput("TARGET")
              .setCheck("String")
              .appendField("replace")
              .appendField(new Blockly.FieldTextInput("b"), "TARGET")
              .appendField("with");
          this.appendValueInput("REPLACEMENT")
              .setCheck("String")
              .appendField(new Blockly.FieldTextInput("d"), "REPLACEMENT")
              .appendField("in");
          this.appendValueInput("STRING")
              .setCheck("String")
              .appendField(new Blockly.FieldTextInput("abc"), "STRING");
          this.setOutput(true, "String");
          this.setColour(160);
          this.setTooltip("Replace all occurrences of target with replacement in string");
        }
      };
    }

    // Arduino Code Generator