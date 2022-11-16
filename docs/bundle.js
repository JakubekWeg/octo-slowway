// src/main.ts
var GAME_WIDTH = 700;
var GAME_HEIGHT = 500;
var message = "Hello world";
console.log(message);
var gameDiv = document.getElementById("game");
gameDiv.style.setProperty("--width", `${GAME_WIDTH}px`);
gameDiv.style.setProperty("--height", `${GAME_HEIGHT}px`);
