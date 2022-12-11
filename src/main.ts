import { Car, CarStats, createCar, updateVisuals } from "./car";
import { CAMERA_HEIGHT, CAMERA_WIDTH } from "./constants";
import { downloadLevel } from "./level";
import { calculatePathProgress, restartCarsFromCheckpoints, restartIfCarsTooFarAway, updateCameraPosition, updatePositionCar } from "./physics";

const gameDiv = document.getElementById("game");
document.getElementById('game-container').style.setProperty("--width", `${CAMERA_WIDTH}px`);
document.getElementById('game-container').style.setProperty("--height", `${CAMERA_HEIGHT}px`);
const level = await downloadLevel();
gameDiv.appendChild(level.visual);

const stats: CarStats = {
  dragRoad: 0.004,
  dragGround: 0.01,
  gripRoad: 0.6,
  gripGround: 0.3,
  accelerationGround: 0.0025,
  accelerationRoad: 0.0025,
  turnSpeed: 0.002
}

const car1: Car = createCar(stats, 100, 50, "yellow", gameDiv);
const car2: Car = createCar(stats, 5000, 50, "blue", gameDiv);

let previous = performance.now();
const update = (time: number) => {
  const delta = time - previous;
  previous = time;

  updatePositionCar(level, car1, delta, { x: car2.centerX, y: car2.centerY });
  updatePositionCar(level, car2, delta, { x: car1.centerX, y: car1.centerY });

  calculatePathProgress(gameDiv, level, car1, car2)
  const restartedCars = restartIfCarsTooFarAway(level, car1, car2)

  updateVisuals(car1);
  updateVisuals(car2);

  updateCameraPosition(gameDiv, car1, car2)
  if (car1.crashed || car2.crashed || restartedCars) {
    if (restartedCars)
      document.getElementById('replay-text').style.display = ''
    else
      document.getElementById('crash-text').style.display = ''
    document.getElementById('crashed-player-id').innerText = car1.crashed ? 'Player one' : 'Player two'
    setTimeout(() => {
      document.getElementById('replay-text').style.display = 'none'
      document.getElementById('crash-text').style.display = 'none'
    }, 2500);
    setTimeout(() => {
      requestAnimationFrame(update);
    }, 3000);
    setTimeout(() => {
      restartCarsFromCheckpoints(level, car1, car2)
      updateVisuals(car1);
      updateVisuals(car2);
      updateCameraPosition(gameDiv, car1, car2)
    }, 2000);
  }
  else
    requestAnimationFrame(update);
};

document.getElementById('replay-text').style.opacity = '0'
setTimeout(() => {
  document.getElementById('replay-text').style.opacity = '1'
}, 3000);
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
