const GAME_WIDTH = 700;
const GAME_HEIGHT = 500;

const message: string = "Hello world";
console.log(message);

const gameDiv = document.getElementById("game");
gameDiv.style.setProperty("--width", `${GAME_WIDTH}px`);
gameDiv.style.setProperty("--height", `${GAME_HEIGHT}px`);
