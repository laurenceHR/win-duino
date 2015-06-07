
// commands
LCD_CLEARDISPLAY = 0x01;
LCD_RETURNHOME = 0x02;
LCD_ENTRYMODESET = 0x04;
LCD_DISPLAYCONTROL = 0x08;
LCD_CURSORSHIFT = 0x10;
LCD_FUNCTIONSET = 0x20;
LCD_SETCGRAMADDR = 0x40;
LCD_SETDDRAMADDR = 0x80;

// flags for display entry mode
LCD_ENTRYRIGHT = 0x00;
LCD_ENTRYLEFT = 0x02;
LCD_ENTRYSHIFTINCREMENT = 0x01;
LCD_ENTRYSHIFTDECREMENT = 0x00;

// flags for display on/off control
LCD_DISPLAYON = 0x04;
LCD_DISPLAYOFF = 0x00;
LCD_CURSORON = 0x02;
LCD_CURSOROFF = 0x00;
LCD_BLINKON = 0x01;
LCD_BLINKOFF = 0x00;

// flags for display/cursor shift
LCD_DISPLAYMOVE = 0x08;
LCD_CURSORMOVE = 0x00;
LCD_MOVERIGHT = 0x04;
LCD_MOVELEFT = 0x00;

// flags for function set
LCD_8BITMODE = 0x10;
LCD_4BITMODE = 0x00;
LCD_2LINE = 0x08;
LCD_1LINE = 0x00;
LCD_5x10DOTS = 0x04;
LCD_5x8DOTS = 0x00;

// flags for backlight control
LCD_BACKLIGHT = 0x08;
LCD_NOBACKLIGHT = 0x00;

En = B00000100;  // Enable bit
Rw = B00000010;  // Read/Write bit
Rs = B00000001;  // Register select bit


var LCDI2C = function (options) {
  if (!options || !options.board) throw new Error('Must supply required options');
  this.board = options.board;
  
  var pins = options.pins || [3, 2];
  if (!Array.isArray(pins))
    this.pins = pins;
  //else if (pins.length % 2)
    //this.pins = {rs:pins[0], rw:pins[1], e:pins[2], data:pins.slice(3)};	
  else
	  this.pins = {scl:pins[0],sda:pins[1]};
    //this.pins = {rs:pins[0], e:pins[1], data:pins.slice(2)};
  if (!('rw' in this.pins)) this.pins.rw = 255;
  
  this.board.pinMode(this.pins.rs, 'out');
  if (this.pins.rw !== 255) {
      this.board.pinMode(this.pins.rw, 'out');
  }
  this.board.pinMode(this.pins.e, 'out');
  
  this.begin(16, 1);
}

LCDI2C.prototype.begin = function (cols, lines, dotsize) {
  this._numlines = lines;
  
  var displayfunction = 0;
  displayfunction |= (lines > 1) ? LCD_2LINE : LCD_1LINE;
  displayfunction |= (dotsize && lines === 1) ? LCD_5x10DOTS : LCD_5x8DOTS;
  
  this._delayMicroseconds(50000);
  this.board.digitalWrite(this.pins.rs, this.board.LOW);
  this.board.digitalWrite(this.pins.e, this.board.LOW);
  if (this.pins.rw !== 255)
    this.board.digitalWrite(this.pins.rw, this.board.LOW);
  
  // put the LCD into 4 bit or 8 bit mode
  if (this.pins.data.length === 4) {
    displayfunction |= LCD_4BITMODE;
    this._writeNbits(4, 0x03);
    this._delayMicroseconds(4500);
    this._writeNbits(4, 0x03);
    this._delayMicroseconds(4500);
    this._writeNbits(4, 0x03);
    this._delayMicroseconds(150);
    this._writeNbits(4, 0x02);
  } else {
    displayfunction |= LCD_8BITMODE;
    this.command(LCD_FUNCTIONSET | displayfunction);
    this._delayMicroseconds(4500);
    this.command(LCD_FUNCTIONSET | displayfunction);
    this._delayMicroseconds(150);
    this.command(LCD_FUNCTIONSET | displayfunction);
  }
  
  this.command(LCD_FUNCTIONSET | displayfunction);
  
  this._displaycontrol = LCD_DISPLAYON | LCD_CURSOROFF | LCD_BLINKOFF;
  this.display();
  
  this.clear();
  
  this._displaymode = LCD_ENTRYLEFT | LCD_ENTRYSHIFTDECREMENT;
  this.leftToRight();
}

LCDI2C.prototype.clear = function () {
  this.command(LCD_CLEARDISPLAY);
  this._delayMicroseconds(2000);  // this command takes a long time!
}

LCDI2C.prototype.expanderWrite(data){
	
}

/*
 * mid/low level stuff
 */

LCD.prototype.command = function (value) {
  this.send(value, this.board.LOW);
}

LCD.prototype.send = function (value, mode) {
  this.board.digitalWrite(this.pins.rs, mode);
  if (this.pins.rw !== 255) {
    this.board.digitalWrite(this.pins.rw, this.board.LOW);
  }
  if (this.pins.data.length === 8) {
    this._writeNbits(8, value);
  } else {
    this._writeNbits(4, value >> 4);
    this._writeNbits(4, value & 0xF);
  }
}

LCD.prototype._writeNbits = function (n, value) {
  for (var i = 0; i < n; i++) {
    this.board.pinMode(this.pins.data[i], 'out');
    var bit = (value >> i) & 0x01;
    this.board.digitalWrite(this.pins.data[i], (bit) ? this.board.HIGH : this.board.LOW);
  }
  this._pulseEnable();
}

LCD.prototype._pulseEnable = function () {
  this.board.digitalWrite(this.pins.e, this.board.LOW);
  this._delayMicroseconds(1);
  this.board.digitalWrite(this.pins.e, this.board.HIGH);
  this._delayMicroseconds(1);    // enable pulse must be >450ns
  this.board.digitalWrite(this.pins.e, this.board.LOW);
  this._delayMicroseconds(100);   // commands need > 37us to settle
}

LCD.prototype._delayMicroseconds = function (us) {
  this.board.delay(us/1000);
}

module.exports = LCDI2C;