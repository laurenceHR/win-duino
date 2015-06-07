win-duino
=========

win-duino: a duino update for working with Arduino in node.js on Windows
From the original duino-project (Unix) to use it with node on Windows OS!
For "duino" see: https://github.com/ecto/duino

# install

change only the ./lib/board.js 

# Windows COM Port selection

````javascript
var board = new arduino.Board({
  debug: true,
  device: 'COM5',
  baudrate: 9600
});
````

# usage

````javascript
var arduino = require('../');

var board = new arduino.Board({
  debug: true,
  device: 'COM5'  
});

var led = new arduino.Led({
  board: board,
  pin: 13
});

board.on('ready', function(){
  led.blink();
});

````

# documentation

For detail documentation see duino: 
https://github.com/ecto/duino

