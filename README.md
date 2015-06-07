win-duino
=========

win-duino: a duino update for working with Arduino in node.js on Windows
From the original duino-project (Unix) to use it with node on Windows OS!
For "duino" see: https://github.com/ecto/duino

# install

npm install win-duino

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
var arduino = require('win-duino');

var leonardo = new arduino.Board({
  debug: true,
  device: 'COM5'  
});

var led = new arduino.Led({
  board: leonardo,
  pin: 13
});

leonardo.on('ready', function(){
  led.blink();
});

````

# documentation

For detail documentation see duino: 
https://github.com/ecto/duino

