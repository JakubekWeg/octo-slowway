import { Car, createCar, updateVisuals } from "./car";
import { GAME_HEIGHT, GAME_WIDTH } from "./constants";
import { downloadLevel } from "./level";
import { updatePositionCar } from "./physics";

const gameDiv = document.getElementById("game");
gameDiv.style.setProperty("--width", `${GAME_WIDTH}px`);
gameDiv.style.setProperty("--height", `${GAME_HEIGHT}px`);
const level = await downloadLevel();

const car1: Car = createCar(100, 50, "green", gameDiv);
const car2: Car = createCar(50, 50, "blue", gameDiv);

let previous = performance.now();
const update = (time: number) => {
  const delta = time - previous;
  previous = time;

  updatePositionCar(level, car1, delta);
  updatePositionCar(level, car2, delta);
  updateVisuals(car1);
  updateVisuals(car2);

  requestAnimationFrame(update);
};

requestAnimationFrame(update);

const handleKey = (key: string, pressed: boolean) => {
  switch (key) {
    case "ArrowUp":
      car1.gasPressed = pressed;
      break;
    case "ArrowDown":
      car1.breakPressed = pressed;
      break;
    case "ArrowRight":
      car1.right = pressed;
      break;
    case "ArrowLeft":
      car1.left = pressed;
      break;
    case "KeyW":
      car2.gasPressed = pressed;
      break;
    case "KeyS":
      car2.breakPressed = pressed;
      break;
    case "KeyD":
      car2.right = pressed;
      break;
    case "KeyA":
      car2.left = pressed;
      break;
  }
};

document.body.addEventListener("keydown", (event) =>
  handleKey(event.code, true)
);
document.body.addEventListener("keyup", (event) =>
  handleKey(event.code, false)
);
