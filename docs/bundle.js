// src/constants.ts
var GAME_WIDTH = 5e3;
var GAME_HEIGHT = 4e3;
var CAR_WIDTH = 32;
var CAR_HEIGHT = 32;
var CAMERA_WIDTH = 720;
var CAMERA_HEIGHT = 405;

// src/car.ts
var createElement = (root, color) => {
  const car = document.createElement("div");
  car.classList.add("car");
  car.style.setProperty("--width", `${CAR_WIDTH.toFixed(2)}px`);
  car.style.setProperty("--height", `${CAR_HEIGHT.toFixed(2)}px`);
  car.style.background = `url("car-${color}.png")`;
  root.appendChild(car);
  return car;
};
var createCar = (stats, x, y, color, root) => {
  return {
    element: createElement(root, color),
    centerX: x,
    centerY: y,
    rotation: 0,
    velocityX: 0,
    velocityY: 0,
    gasPressed: false,
    breakPressed: false,
    right: false,
    left: false,
    crashed: false,
    lastCheckpointIndex: 0,
    stats
  };
};
var updateVisuals = (car) => {
  car.element.style.setProperty("--x", `${car.centerX.toFixed(2)}px`);
  car.element.style.setProperty("--y", `${car.centerY.toFixed(2)}px`);
  car.element.style.setProperty("--angle", `${car.rotation.toFixed(2)}rad`);
};

// src/clock.ts
var Clock = class {
  totalTime = 0;
  startTime = 0;
  timerId;
  uiElement;
  start() {
    this.startTime = performance.now();
    clearInterval(this.timerId);
    this.timerId = setInterval(() => {
      this.updateUI();
    }, 260);
  }
  getElapsedSeconds() {
    return Math.round((this.timerId !== void 0 ? this.totalTime + performance.now() - this.startTime : this.totalTime) / 1e3);
  }
  pause() {
    if (this.timerId === void 0)
      return;
    this.totalTime += performance.now() - this.startTime;
    clearInterval(this.timerId);
    this.timerId = void 0;
    this.updateUI();
  }
  updateUI() {
    if (this.uiElement) {
      const total = this.getElapsedSeconds();
      const seconds = total % 60 | 0;
      const minutes = total / 60 | 0;
      this.uiElement.innerText = `${minutes < 10 ? "0" + minutes : minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
    }
  }
};

// src/level.ts
var getSourceFilterGroup = (content, name) => {
  const svgDoc = new DOMParser().parseFromString(content, "image/svg+xml");
  [...svgDoc.querySelectorAll(`svg>g`)].filter((e) => e.getAttribute("inkscape:label") !== name).forEach((e) => e.remove());
  return new XMLSerializer().serializeToString(svgDoc);
};
var createImage = (src) => {
  const img = document.createElement("img");
  img.src = src;
  return new Promise(
    (resolve) => img.onload = () => resolve(img)
  );
};
var TEXTURE_DATA_DIVISOR = 2;
var extractTextureData = async (svgContent, groupName) => {
  const svg = getSourceFilterGroup(svgContent, groupName);
  const img = await createImage("data:image/svg+xml;base64," + btoa(svg));
  const canvas = document.createElement("canvas");
  canvas.width = GAME_WIDTH / TEXTURE_DATA_DIVISOR | 0;
  canvas.height = GAME_HEIGHT / TEXTURE_DATA_DIVISOR | 0;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    img,
    0,
    0,
    GAME_WIDTH / TEXTURE_DATA_DIVISOR,
    GAME_HEIGHT / TEXTURE_DATA_DIVISOR
  );
  const { data } = ctx.getImageData(0, 0, GAME_WIDTH, GAME_HEIGHT);
  const pixelsCount = data.length / 4;
  const colorData = new Uint8ClampedArray(pixelsCount);
  for (let i = 0, l = pixelsCount; i < l; ++i) {
    colorData[i] = data[i * 4 + 3];
  }
  return colorData;
};
var extractVisualCanvas = async (svgContent) => {
  const svg = getSourceFilterGroup(svgContent, "visible");
  const img = await createImage("data:image/svg+xml;base64," + btoa(svg));
  const canvas = document.createElement("canvas");
  canvas.width = GAME_WIDTH;
  canvas.height = GAME_HEIGHT;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  return canvas;
};
var getPathPoints = (svgContent) => {
  const svgDoc = new DOMParser().parseFromString(svgContent, "image/svg+xml");
  const path = [...svgDoc.querySelectorAll(`path`)].find((e) => e.getAttribute("inkscape:label") === "checkpoints");
  const [_, ...steps] = path.getAttribute("d").split(" ");
  const moveCoords = steps.map((e) => e.split(",").map((e2) => parseFloat(e2)));
  const pathPoints = [];
  let x = 0;
  let y = 0;
  for (const [ox, oy] of moveCoords) {
    x += ox;
    y += oy;
    pathPoints.push({ x, y });
  }
  return pathPoints;
};
var downloadLevel = async () => {
  const content = await (await fetch("./level.svg")).text();
  const points = getPathPoints(content);
  return {
    obstacles: await extractTextureData(content, "obstacles"),
    road: await extractTextureData(content, "road"),
    visual: await extractVisualCanvas(content),
    pathPoints: [...points, ...points, ...points],
    pointsPerLap: points.length,
    lastCheckpointReachedIndex: -1
  };
};
var isThereAnyColor = (data, x, y) => {
  if (x < 0 || y < 0 || x >= GAME_WIDTH || y >= GAME_HEIGHT)
    return true;
  const pixelIndex = (x / TEXTURE_DATA_DIVISOR | 0) + (y / TEXTURE_DATA_DIVISOR | 0) * GAME_WIDTH;
  const isInRed = data[pixelIndex] > 0;
  return isInRed;
};

// src/physics.ts
var distanceSquared = (ax, ay, bx, by) => {
  return (ax - bx) ** 2 + (ay - by) ** 2;
};
var updatePositionCar = (level2, car, delta, otherCarPosition) => {
  const isOnRoad = checkIfInObstacle(
    level2.road,
    car.centerX,
    car.centerY,
    car.rotation
  );
  const grip = isOnRoad ? car.stats.gripRoad : car.stats.gripGround;
  car.velocityX -= car.velocityX * (isOnRoad ? car.stats.dragRoad : car.stats.dragGround) * delta * (1 - Math.abs(Math.sin(-car.rotation)) * grip);
  car.velocityY -= car.velocityY * (isOnRoad ? car.stats.dragRoad : car.stats.dragGround) * delta * (1 - Math.abs(Math.cos(-car.rotation)) * grip);
  const acceleration = isOnRoad ? car.stats.accelerationRoad : car.stats.accelerationGround;
  let addedAcceleration = 0;
  if (car.gasPressed)
    addedAcceleration += acceleration * delta;
  if (car.breakPressed)
    addedAcceleration -= acceleration * delta;
  let newRotation = car.rotation;
  const turnSpeed = car.stats.turnSpeed;
  const currentVelocity = Math.sqrt(
    car.velocityX * car.velocityX + car.velocityY * car.velocityY
  );
  if (car.left)
    newRotation -= Math.PI * turnSpeed * delta * currentVelocity;
  if (car.right)
    newRotation += Math.PI * turnSpeed * delta * currentVelocity;
  car.velocityX += addedAcceleration * Math.cos(-car.rotation + Math.PI / 2);
  car.velocityY += addedAcceleration * Math.sin(-car.rotation + Math.PI / 2);
  const newCenterX = car.centerX + car.velocityX * delta;
  const newCenterY = car.centerY - car.velocityY * delta;
  const crashed = checkIfInObstacle(
    level2.obstacles,
    newCenterX,
    newCenterY,
    car.rotation
  ) || checkIfCarsTooNear({ x: newCenterX, y: newCenterY }, otherCarPosition);
  if (crashed) {
    car.velocityX *= -0.2;
    car.velocityY *= -0.2;
    if (currentVelocity > 0.2) {
      car.crashed = true;
    }
  } else {
    car.centerX = newCenterX;
    car.centerY = newCenterY;
    car.rotation = newRotation;
  }
};
var checkIfInObstacle = (data, cx, cy, angle) => {
  const x1 = CAR_HEIGHT / 2 * Math.cos(-angle + Math.PI / 2);
  const y1 = CAR_HEIGHT / 2 * Math.sin(-angle + Math.PI / 2);
  const x2 = CAR_WIDTH / 2 * Math.cos(-angle);
  const y2 = CAR_WIDTH / 2 * Math.sin(-angle);
  return isThereAnyColor(data, cx - x1 - x2, cy + y1 + y2) || isThereAnyColor(data, cx + x1 + x2, cy - y1 - y2) || isThereAnyColor(data, cx - x1 + x2, cy + y1 - y2) || isThereAnyColor(data, cx + x1 - x2, cy - y1 + y2) || false;
};
var checkIfCarsTooNear = (a, b) => {
  return distanceSquared(a.x, a.y, b.x, b.y) < CAR_WIDTH * CAR_HEIGHT;
};
var restartIfCarsTooFarAway = (level2, car1, car2) => {
  const deltaX = Math.abs(car1.centerX - car2.centerX);
  const deltaY = Math.abs(car1.centerY - car2.centerY);
  if (deltaX > CAMERA_WIDTH || deltaY > CAMERA_HEIGHT) {
    restartCarsFromCheckpoints(level2, car1, car2);
    return true;
  }
  return false;
};
var updateCheckpointForCar = (level2, car) => {
  const lastPoint = level2.pathPoints[car.lastCheckpointIndex];
  const nextPoint = level2.pathPoints[car.lastCheckpointIndex + 1];
  if (!nextPoint)
    return;
  if (distanceSquared(car.centerX, car.centerY, nextPoint.x, nextPoint.y) < distanceSquared(car.centerX, car.centerY, lastPoint.x, lastPoint.y)) {
    car.lastCheckpointIndex = car.lastCheckpointIndex + 1;
  }
};
var calculatePathProgress = (gameDiv2, level2, car1, car2) => {
  updateCheckpointForCar(level2, car1);
  updateCheckpointForCar(level2, car2);
  const sharedCheckpointIndex = Math.min(car1.lastCheckpointIndex, car2.lastCheckpointIndex);
  if (level2.lastCheckpointReachedIndex !== sharedCheckpointIndex) {
    level2.lastCheckpointReachedIndex = sharedCheckpointIndex;
    for (const element of document.getElementsByClassName("checkpoint")) {
      element.classList.remove("active");
      element.classList.add("inactive");
    }
    const checkpoint = document.createElement("div");
    checkpoint.classList.add("checkpoint");
    const point = level2.pathPoints[sharedCheckpointIndex];
    checkpoint.style.setProperty("--x", `${point.x}px`);
    checkpoint.style.setProperty("--y", `${point.y}px`);
    gameDiv2.appendChild(checkpoint);
    requestAnimationFrame(() => {
      checkpoint.classList.toggle("active");
    });
  }
};
var updateCameraPosition = (gameDiv2, car1, car2) => {
  const cameraCenterX = (car1.centerX + car2.centerX) / 2;
  const cameraCenterY = (car1.centerY + car2.centerY) / 2;
  gameDiv2.scrollLeft = cameraCenterX - CAMERA_WIDTH / 2;
  gameDiv2.scrollTop = cameraCenterY - CAMERA_HEIGHT / 2;
};
var restartCarsFromCheckpoints = (level2, car1, car2) => {
  car1.crashed = car2.crashed = false;
  const checkpointLocation = level2.pathPoints[level2.lastCheckpointReachedIndex];
  const nextCheckpointLocation = level2.pathPoints[level2.lastCheckpointReachedIndex + 1];
  let rotateToNextCheckpointAngleDegrees = 0;
  if (nextCheckpointLocation) {
    const differenceX = nextCheckpointLocation.x - checkpointLocation.x;
    const differenceY = -(nextCheckpointLocation.y - checkpointLocation.y);
    const radians = Math.atan2(differenceY, differenceX);
    rotateToNextCheckpointAngleDegrees = -radians + Math.PI / 2;
    car1.rotation = car2.rotation = rotateToNextCheckpointAngleDegrees;
  }
  const matrix = new DOMMatrix(`rotate(${rotateToNextCheckpointAngleDegrees || 0}rad) translate(${CAR_WIDTH}px, 0)`);
  const car1Point = matrix.transformPoint(new DOMPoint(0, 0));
  car1.centerX = car1Point.x + checkpointLocation.x;
  car1.centerY = car1Point.y + checkpointLocation.y;
  const car2Point = matrix.transformPoint(new DOMPoint(0, 0));
  car2.centerX = -car2Point.x + checkpointLocation.x;
  car2.centerY = -car2Point.y + checkpointLocation.y;
  car1.velocityX = car1.velocityY = car2.velocityX = car2.velocityY = 0;
  car1.lastCheckpointIndex = car2.lastCheckpointIndex = level2.lastCheckpointReachedIndex;
};
var gameIsOver = (level2) => {
  if (level2.lastCheckpointReachedIndex >= level2.pathPoints.length - 1) {
    return true;
  }
  return false;
};
var getCurrentLap = (level2) => {
  return Math.ceil(level2.lastCheckpointReachedIndex / level2.pointsPerLap);
};

// src/stats.ts
var roadsToGrip = {
  "dry": [0.6, 0.4],
  "wet": [0.4, 0.15],
  "icy": [0.015, 1e-3]
};
var speedToDrag = {
  "fastest": [5e-4, 5e-3],
  "faster": [1e-3, 8e-3],
  "fast": [4e-3, 0.01],
  "normal": [0.01, 0.03]
};
var accelerationMap = {
  "slow": 2e-3,
  "normal": 4e-3,
  "fast": 55e-4
};
var makeStats = (roads, speed, acceleration) => {
  const stats = {
    dragRoad: speedToDrag[speed][0],
    dragGround: speedToDrag[speed][1],
    gripRoad: roadsToGrip[roads][0],
    gripGround: roadsToGrip[roads][1],
    accelerationGround: accelerationMap[acceleration],
    accelerationRoad: accelerationMap[acceleration],
    turnSpeed: 3e-3
  };
  return stats;
};

// src/main.ts
var gameDiv = document.getElementById("game");
document.getElementById("game-container").style.setProperty("--width", `${CAMERA_WIDTH}px`);
document.getElementById("game-container").style.setProperty("--height", `${CAMERA_HEIGHT}px`);
var level = await downloadLevel();
gameDiv.appendChild(level.visual);
var startLevel = (stats) => {
  const car1 = createCar(stats, 100, 50, "yellow", gameDiv);
  const car2 = createCar(stats, 5e3, 50, "blue", gameDiv);
  const clock = new Clock();
  clock.uiElement = document.getElementById("time-car1");
  const lapCounter = document.getElementById("lap-counter");
  let previous = performance.now();
  let paused = false;
  const update = (time) => {
    const delta = time - previous;
    previous = time;
    if (paused) {
      requestAnimationFrame(update);
      return;
    }
    updatePositionCar(level, car1, delta, { x: car2.centerX, y: car2.centerY });
    updatePositionCar(level, car2, delta, { x: car1.centerX, y: car1.centerY });
    calculatePathProgress(gameDiv, level, car1, car2);
    const restartedCars = restartIfCarsTooFarAway(level, car1, car2);
    updateVisuals(car1);
    updateVisuals(car2);
    updateCameraPosition(gameDiv, car1, car2);
    lapCounter.innerText = `${getCurrentLap(level)}`;
    if (car1.crashed || car2.crashed || restartedCars) {
      paused = null;
      clock.pause();
      if (restartedCars)
        document.getElementById("replay-text").style.display = "";
      else
        document.getElementById("crash-text").style.display = "";
      document.getElementById("crashed-player-id").innerText = car1.crashed ? "Player one" : "Player two";
      setTimeout(() => {
        document.getElementById("replay-text").style.display = "none";
        document.getElementById("crash-text").style.display = "none";
      }, 2500);
      setTimeout(() => {
        restartCarsFromCheckpoints(level, car1, car2);
        updateVisuals(car1);
        updateVisuals(car2);
        updateCameraPosition(gameDiv, car1, car2);
      }, 2e3);
      setTimeout(() => {
        clock.start();
        paused = false;
        requestAnimationFrame(update);
      }, 3e3);
    } else if (gameIsOver(level)) {
      document.getElementById("game-won-text").style.display = "";
    } else {
      requestAnimationFrame(update);
    }
  };
  document.getElementById("replay-text").style.opacity = "0";
  setTimeout(() => {
    document.getElementById("replay-text").style.opacity = "1";
  }, 3e3);
  requestAnimationFrame(update);
  const handleKey = (key, pressed) => {
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
    if (!pressed && (key === "KeyP" || key === "Escape")) {
      if (paused === false) {
        paused = true;
        document.getElementById("pause-text").style.display = "";
      } else if (key !== "Escape" && paused === true) {
        paused = false;
        document.getElementById("pause-text").style.display = "none";
      }
    }
  };
  document.body.addEventListener(
    "keydown",
    (event) => handleKey(event.code, true)
  );
  document.body.addEventListener(
    "keyup",
    (event) => handleKey(event.code, false)
  );
};
for (const option of document.getElementsByClassName("option")) {
  const forRoads = option.classList.contains("roads");
  const forSpeed = option.classList.contains("speed");
  const forAcceleration = option.classList.contains("acceleration");
  option.addEventListener("click", () => {
    if (forRoads) {
      for (const other of document.getElementsByClassName("roads"))
        other.classList.remove("selected");
      option.classList.add("selected");
    } else if (forSpeed) {
      for (const other of document.getElementsByClassName("speed"))
        other.classList.remove("selected");
      option.classList.add("selected");
    } else if (forAcceleration) {
      for (const other of document.getElementsByClassName("acceleration"))
        other.classList.remove("selected");
      option.classList.add("selected");
    } else if (option.classList.contains("start")) {
      const roads = document.querySelector(".selected.option.roads").textContent.trim().split(" ")[0].toLowerCase();
      const speed = document.querySelector(".selected.option.speed").textContent.trim().split(" ")[0].toLowerCase();
      const acceleration = document.querySelector(".selected.option.acceleration").textContent.trim().split(" ")[0].toLowerCase();
      document.getElementById("menu").remove();
      startLevel(makeStats(roads, speed, acceleration));
    }
  });
}
