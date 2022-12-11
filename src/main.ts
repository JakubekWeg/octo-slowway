import { Car, CarStats, createCar, updateVisuals } from "./car";
import Clock from "./clock";
import { CAMERA_HEIGHT, CAMERA_WIDTH } from "./constants";
import { downloadLevel } from "./level";
import { calculatePathProgress, gameIsOver, restartCarsFromCheckpoints, restartIfCarsTooFarAway, updateCameraPosition, updatePositionCar } from "./physics";
import { makeStats } from "./stats";

const gameDiv = document.getElementById("game");
document.getElementById('game-container').style.setProperty("--width", `${CAMERA_WIDTH}px`);
document.getElementById('game-container').style.setProperty("--height", `${CAMERA_HEIGHT}px`);
const level = await downloadLevel();
gameDiv.appendChild(level.visual);

const startLevel = (stats: CarStats) => {
  console.log(stats);



  const car1: Car = createCar(stats, 100, 50, "yellow", gameDiv);
  const car2: Car = createCar(stats, 5000, 50, "blue", gameDiv);

  const clock = new Clock()
  clock.uiElement = document.getElementById('time-car1')
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
      clock.pause()
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
        restartCarsFromCheckpoints(level, car1, car2)
        updateVisuals(car1);
        updateVisuals(car2);
        updateCameraPosition(gameDiv, car1, car2)
      }, 2000);
      setTimeout(() => {
        clock.start()
        requestAnimationFrame(update);
      }, 3000);
    }
    else if (gameIsOver(level)) {
      document.getElementById('game-won-text').style.display = ''
    }
    else {
      requestAnimationFrame(update);
    }
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
}



for (const option of document.getElementsByClassName('option')) {
  const forRoads = option.classList.contains('roads')
  const forSpeed = option.classList.contains('speed')
  const forAcceleration = option.classList.contains('acceleration')

  option.addEventListener('click', () => {
    if (forRoads) {
      for (const other of document.getElementsByClassName('roads'))
        other.classList.remove('selected')
      option.classList.add('selected')
    } else if (forSpeed) {
      for (const other of document.getElementsByClassName('speed'))
        other.classList.remove('selected')
      option.classList.add('selected')
    } else if (forAcceleration) {
      for (const other of document.getElementsByClassName('acceleration'))
        other.classList.remove('selected')
      option.classList.add('selected')
    } else if (option.classList.contains('start')) {

      const roads = document.querySelector('.selected.option.roads').textContent.trim().split(' ')[0].toLowerCase()
      const speed = document.querySelector('.selected.option.speed').textContent.trim().split(' ')[0].toLowerCase()
      const acceleration = document.querySelector('.selected.option.acceleration').textContent.trim().split(' ')[0].toLowerCase()

      document.getElementById('menu').remove()

      startLevel(makeStats(roads as any, speed as any, acceleration as any))
    }
  })
}