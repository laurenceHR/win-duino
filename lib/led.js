
/*
 * Main LED constructor
 * Process options
 * Tell the board to set it up
 */
 
var Led = function (options,callback) {
  if (!options || !options.board) throw new Error('Must supply required options to LED');
  this.board = options.board;
  this.pin = options.pin || 13;
  this.bright = 0;
  this.board.pinMode(this.pin, 'out');
  this.direction = -1;
  if(callback) callback();
  return this;
}

Led.prototype.brightLevel = function(val) {
	this.board.analogWrite(this.pin, this.bright = val);
}

// Turn the LED on
Led.prototype.on = function (callback) {
	this.board.digitalWrite(this.pin, this.board.HIGH);
	this.bright = 255;
	if(callback) callback();
	return this;
}
// Turn the LED off
Led.prototype.off = function (callback) {
  this.board.digitalWrite(this.pin, this.board.LOW);
  this.bright = 0;
  return this;
}

// Start a bariable blinking pattern
Led.prototype.blink = function (interval) {
  interval = interval || 1000;
  var self = this;
  setInterval(function(){
    if (self.bright) {
      self.off()
    } else {
      self.on();
    }
  }, interval);
}

Led.prototype.fade = function(interval) {
	to = (interval||5000)/(255*2);
	var self = this;
	setInterval(function() {
		if(!self.board.serial) return; //Interval too fast for debug messages on ^c
		if(self.bright==0) direction = 1;
		if(self.bright==255) direction = -1;
		self.brightLevel(self.bright+direction);
	},to);
}


Led.prototype.fadeOut = function(interval,d) { //console.log(this.bright);
	var self = this;
	var direction = (d || 1) ;
	if(self.bright - direction <= 0){ self.brightLevel(0);return; }
	if(!self.board.serial) return; //Interval too fast for debug messages on ^c			
	self.brightLevel(self.bright - direction);
	this.board.delayArduino(interval);
	self.fadeOut(interval,d);
}
Led.prototype.fadeIn = function(interval,d) { //console.log(this.bright);
	var self = this; 
	var direction = (d || 1) ;	
	if(self.bright + direction >= 255){ self.brightLevel(255); return;}	
	if(!self.board.serial) return; //Interval too fast for debug messages on ^c		
	self.brightLevel(self.bright + direction);
	this.board.delayArduino(interval);
	self.fadeIn(interval,d); 	
}

module.exports = Led;
