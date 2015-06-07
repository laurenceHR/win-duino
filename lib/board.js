
var events = require('events'),
    child  = require('child_process'),
    util   = require('util'),
    colors = require('colors'),
    serial = require('serialport');

/*
 * The main Arduino constructor
 * Connect to the serial port and bind
 */


var Board = function (options) {
  this.logInfo('info', 'initializing');
  this.debug = options && options.debug || false;
  this.device = options && options.device || 'COM20';
  this.baudrate = options && options.baudrate || 9600;
  this.writeBuffer = [];
  this.isOpen = false;
  this.writing = false;
  this.attempsWriting = 0;
  this.maxAttempsWriting = options && options.maxAttempsWriting || 150;
  this.endProcess = false;

  var self = this;
  this.detect(function (err, serial) {
    if (err) {
      if(self.listeners('error').length)
        self.emit('error', err);
      else
        throw new Error(err);
    }else{
      self.serial = serial;
      self.emit('connected');
		
      self.logInfo('info', 'binding serial events');
	  
      self.serial.on('data', function(data){
        self.logInfo('receive', data.toString().red);
        self.emit('data', data);
      });
	  // Open Port
		//self.open();
    //self.delay(100);
      //setTimeout(function(){
    //console.log('self.open()');
    self.open();
    }
  });
}


//Board.prototype.isOpen = false;
/*
 * EventEmitter, I choose you!
 */
util.inherits(Board, events.EventEmitter);

/*
 * Detect an Arduino board
 * Loop through all USB devices and try to connect
 * This should really message the device and wait for a correct response
 */
Board.prototype.detect = function (callback) {
  this.logInfo('info', 'attempting to find Arduino board on windows');
  var self = this;
  var found = false,
      err = null,
      temp;

  try {
	temp = new serial.SerialPort(this.device, {
		baudrate: this.baudrate,
		dataBits: 8,
		parity: 'none',
		stopBits: 1,
		flowControl: false,
		parser: serial.parsers.readline('\n')
	},false);
  } catch (e) {
		err = e;
  }

  if (!err) {
	found = temp;
	self.logSuccess('success','found board at ' + this.device+ " with "+this.baudrate);	
  } else {
	err = new Error('!!!!! Could not find Arduino on '+ this.device);
  }
		
  callback(err, found);
}

Board.prototype.exit = function(){
  this.endProcess = true;
}
  
/*
 * serialport open
 */
 Board.prototype.open = function(){	
	this.logWarning('port','opening port...');
	if(this.isOpen){ this.logWarning('port','port already openned'); return true;}
	var self = this;
	this.serial.open(function (error) {
		if ( error ) {
			self.logError('port','error to open: ' + error);
      self.isOpen = false;
      return false;
		} else {			
			self.logSuccess('port','port openned');
      self.isOpen = true;
      //console.log(self.isOpen);
      //self.processWriteBuffer();
      self.ready();
      return true;
		}    
	});
 }
Board.prototype.ready = function(callback){
  self = this;
  this.isOpen = true;
  self.logInfo('info', 'board not yet ready');
  self.sendClearingBytes();

  if (self.debug) {
    self.logInfo('info', 'sending debug mode toggle on to board');
    self.write('99' + self.normalizePin(0) + self.normalizeVal(10),function(){        

        if (self.writeBuffer.length > 0) {self.processWriteBuffer();}                
        self.logInfo('info', 'board ready');
        self.emit('ready');
    });

    if (process.platform === "win32") {
      var rl = require("readline").createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.on("SIGINT", function () {
        process.emit("SIGINT");
      });
    }

    process.on('SIGINT', function(){
      self.logError('ending','Closing');
      self.emit('end');
     
      setTimeout(function(){
        self.logInfo('info', 'sending debug mode toggle off to board');
        self.write('99' + self.normalizePin(0) + self.normalizeVal(0));              
        self.exit();        
      }, 100);
    });
    
   
  }else{
    self.logInfo('info', 'board ready');
  }

   return this;
}

/*
 * The board will eat the first 4 bytes of the session
 * So we give it crap to eat
 */
Board.prototype.sendClearingBytes = function () {
  this.serial.write('00000000');
}

/*
 * Process the writeBuffer (messages attempted before serial was ready)
 */
Board.prototype.processWriteBuffer = function () {
  var t = this.writeBuffer.length;
  this.log('info', 'processing buffered messages (' + t + ')');
  /*
  while (this.writeBuffer.length > 0) {
    this.log('info', 'writing buffered message');
    this.write(this.writeBuffer.shift());
  }
  */
  if(t > 0){
    this.write(this.writeBuffer.shift());
  }else{
    if(this.endProcess){
        self.logError('end','Closed');
        delete self.serial;
        process.exit();
    }
  }
  //this.log('info', 'buffered messages processed');
}

Board.prototype.endWriting = function(){
  this.writing = false;
}
Board.prototype.varAttempsWriting = function(d){
  this.attempsWriting += d;
}
/*
 * Low-level serial write
 */
Board.prototype.write = function (m,callback) { 
  if(this.attempsWriting>this.maxAttempsWriting){ this.logError('error','too many attemps to write'); return false;}
  //while(this.writing)	{ this.logWarning('writing','Writing Waiting'); }
  if(!this.writing){
    this.writing = true;
    var self = this;
    if (this.serial) {	
      this.logWarning('writing', m);
  	  //if(!this.isOpen){ this.open(); }
    	try{		      
    		this.serial.write('!' + m + '.',function(error){
          if(error){
            self.logError('write','Error Writting');
          }else{
            self.varAttempsWriting(-1);
            self.logSuccess('write', 'Writed ' + m );             
            self.endWriting();
            self.processWriteBuffer();
            if(callback) callback();
          }
        });
    		
    	} catch (e) {		
    		//this.log('error', 'Error Writing');
    		this.logError('error', 'Error Writing, buffering message: ' + m.red);
    		this.writeBuffer.push(m);
    	}
    } else {
      this.logWarning('port', 'serial not ready, buffering message: ' + m.red);
      this.writeBuffer.push(m);
    }
  }else{
    this.varAttempsWriting(+1);
    this.logWarning('write', 'write bussy');
    this.logWarning('port', 'serial not ready, buffering message: ' + m.red);
    this.writeBuffer.push(m);
  }
}

/*
 * Add a 0 to the front of a single-digit pin number
 */
Board.prototype.normalizePin = function (pin) {
  return this.lpad( 2, '0', pin );
}

Board.prototype.normalizeVal = function(val) {
	return this.lpad( 3, '0', val );
}

//
Board.prototype.lpad = function(len, chr, str) {
  return (Array(len + 1).join(chr || ' ') + str).substr(-len);
};
Board.prototype.rpad = function(len, chr, str) {
  return ( str + Array(len + 1).join(chr || ' ') ).substr(0,len);
};
/*
 * Define constants
 */
Board.prototype.HIGH = '255';
Board.prototype.LOW = '000';

/*
 * Set a pin's mode
 * val == out = 001
 * val == in  = 000
 */
Board.prototype.pinMode = function (pin, val) {
  pin = this.normalizePin(pin);
  this.log('pin', 'set pin ' + pin + ' mode to ' + val);
  val = (
    val == 'out' ?
    this.normalizeVal(1) :
    this.normalizeVal(0)
  );
  this.write('00' + pin + val);
}

/*
 * Tell the board to write to a digital pin
 */
Board.prototype.digitalWrite = function (pin, val) {
  pin = this.normalizePin(pin);
  val = this.normalizeVal(val);
  this.logInfo('write', 'digitalWrite to pin ' + pin + ': ' + val.green);
  this.write('01' + pin + val);
}

/*
 * Tell the board to extract data from a pin
 */
Board.prototype.digitalRead = function (pin) {
  pin = this.normalizePin(pin);
  this.logInfo('read', 'digitalRead from pin ' + pin);
  this.write('02' + pin + this.normalizeVal(0));
}

Board.prototype.analogWrite = function (pin, val) {
	pin = this.normalizePin(pin);
	val = this.normalizeVal(val);
	this.logInfo('write', 'analogWrite to pin ' + pin + ': ' + val.green);
	this.write('03' + pin + val);
}
Board.prototype.analogRead = function (pin) {
	pin = this.normalizePin(pin);
	this.logInfo('read', 'analogRead from pin ' + pin);
	this.write('04' + pin + this.normalizeVal(0));
}

/*
 * Utility function to pause for a given time
 */
Board.prototype.delayArduino = function (ms) {
  this.log('delay', ms + ' ms');
  this.write('05' + this.lpad(5,'0',ms) );
}
Board.prototype.delay = function (ms) {
  ms += +new Date();
  while (+new Date() < ms) { }
}

/*
 * Logger utility function
 */
Board.prototype.getDateTimeString = function(){
	var d  = new Date;
	var date = '';
	var time = '';
	//var date = d.getFullYear() + '-' + this.rpad(2,'0',d.getMonth()) + '-' + d.getDate() + ' ' + d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds()+ '.'+ d.getMilliseconds();
	time = ' ' + this.lpad(2,'0',d.getHours()) + ':' + this.lpad(2,'0',d.getMinutes()) + ':' + this.lpad(2,'0',d.getSeconds()) + '.'+ this.rpad(3,'0',d.getMilliseconds());
	return date + time;
}
Board.prototype.log = function (/*level, message*/) {
	var args = [].slice.call(arguments);
	if (this.debug) {
		console.log( this.getDateTimeString().gray + ' win-duino '.blue + this.rpad(10,' ',args.shift()).gray + ' ' + args.join(', '));
	}
}
Board.prototype.logSuccess = function(){
	var args = [].slice.call(arguments);
	if (this.debug) {
		console.log( this.getDateTimeString().gray + ' win-duino '.blue + this.rpad(10,' ',args.shift()).green + ' ' + args.join(', '));
	}
}
Board.prototype.logError = function(){
	var args = [].slice.call(arguments);
	if (this.debug) {
		console.log( this.getDateTimeString().gray + ' win-duino '.blue + this.rpad(10,' ',args.shift()).red + ' ' + args.join(', '));
	}
}
Board.prototype.logWarning = function(){
	var args = [].slice.call(arguments);
	if (this.debug) {
		console.log( this.getDateTimeString().gray + ' win-duino '.blue + this.rpad(10,' ',args.shift()).yellow + ' ' + args.join(', '));
	}
}
Board.prototype.logInfo = function(){
	var args = [].slice.call(arguments);
	if (this.debug) {
		console.log( this.getDateTimeString().gray + ' win-duino '.blue + this.rpad(10,' ',args.shift()).magenta + ' ' + args.join(', '));
	}
}
module.exports = Board;