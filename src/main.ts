import { Car, createCar, updateVisuals } from "./car";
import { CAMERA_HEIGHT, CAMERA_WIDTH } from "./constants";
import { downloadLevel } from "./level";
import { calculatePathProgress, restartIfCarsTooFarAway, updateCameraPosition, updatePositionCar } from "./physics";

const gameDiv = document.getElementById("game");
gameDiv.style.setProperty("--width", `${CAMERA_WIDTH}px`);
gameDiv.style.setProperty("--height", `${CAMERA_HEIGHT}px`);
const level = await downloadLevel();
gameDiv.appendChild(level.visual);

const car1: Car = createCar(100, 50, "green", gameDiv);
const car2: Car = createCar(5000, 50, "blue", gameDiv);

let previous = performance.now();
const update = (time: number) => {
  const delta = time - previous;
  previous = time;

  updatePositionCar(level, car1, delta);
  updatePositionCar(level, car2, delta);

  calculatePathProgress(gameDiv, level, car1, car2)
  restartIfCarsTooFarAway(level, car1, car2)

  updateVisuals(car1);
  updateVisuals(car2);

  updateCameraPosition(gameDiv, car1, car2)

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
