// src/constants.ts
var GAME_WIDTH = 5e3;
var GAME_HEIGHT = 4e3;
var CAR_WIDTH = 30;
var CAR_HEIGHT = 30;
var CAMERA_WIDTH = 700;
var CAMERA_HEIGHT = 700;
var CAR_ACCELERATION_ROAD = 25e-4;
var CAR_ACCELERATION_GROUND = 25e-4;
var CAR_GRIP_PERCENTAGE_ROAD = 0.6;
var CAR_GRIP_PERCENTAGE_GROUND = 0.3;
var DRAG_ROAD = 4e-3;
var DRAG_GROUND = 0.01;
var TURN_SPEED_ROAD = 2e-3;
var TURN_SPEED_GROUND = 2e-3;

// src/car.ts
var createElement = (root, color) => {
  const car = document.createElement("div");
  car.classList.add("car");
  car.style.setProperty("--width", `${CAR_WIDTH.toFixed(2)}px`);
  car.style.setProperty("--height", `${CAR_HEIGHT.toFixed(2)}px`);
  car.style.backgroundColor = color;
  root.appendChild(car);
  return car;
};
var createCar = (x, y, color, root) => {
  return {
    element: createElement(root, color),
    centerX: x,
    centerY: y,
    rotation: 1e-5,
    velocityX: 0,
    velocityY: 0,
    gasPressed: false,
    breakPressed: false,
    right: false,
    left: false,
    lastCheckpointIndex: 0
  };
};
var updateVisuals = (car) => {
  car.element.style.setProperty("--x", `${car.centerX.toFixed(2)}px`);
  car.element.style.setProperty("--y", `${car.centerY.toFixed(2)}px`);
  car.element.style.setProperty("--angle", `${car.rotation.toFixed(2)}rad`);
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
  return {
    obstacles: await extractTextureData(content, "obstacles"),
    road: await extractTextureData(content, "road"),
    visual: await extractVisualCanvas(content),
    pathPoints: getPathPoints(content),
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
var updatePositionCar = (level2, car, delta) => {
  const isOnRoad = checkCarPosition(
    level2.road,
    car.centerX,
    car.centerY,
    car.rotation
  );
  const grip = isOnRoad ? CAR_GRIP_PERCENTAGE_ROAD : CAR_GRIP_PERCENTAGE_GROUND;
  car.velocityX -= car.velocityX * (isOnRoad ? DRAG_ROAD : DRAG_GROUND) * delta * (1 - Math.abs(Math.sin(-car.rotation)) * grip);
  car.velocityY -= car.velocityY * (isOnRoad ? DRAG_ROAD : DRAG_GROUND) * delta * (1 - Math.abs(Math.cos(-car.rotation)) * grip);
  const acceleration = isOnRoad ? CAR_ACCELERATION_ROAD : CAR_ACCELERATION_GROUND;
  let addedAcceleration = 0;
  if (car.gasPressed)
    addedAcceleration += acceleration * delta;
  if (car.breakPressed)
    addedAcceleration -= acceleration * delta;
  let newRotation = car.rotation;
  const turnSpeed = isOnRoad ? TURN_SPEED_ROAD : TURN_SPEED_GROUND;
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
  const crashed = checkCarPosition(
    level2.obstacles,
    newCenterX,
    newCenterY,
    car.rotation
  );
  if (crashed) {
    car.velocityX *= -0.2;
    car.velocityY *= -0.2;
    console.log("Hit", currentVelocity | 0);
  } else {
    car.centerX = newCenterX;
    car.centerY = newCenterY;
    car.rotation = newRotation;
  }
};
var checkCarPosition = (data, cx, cy, angle) => {
  const x1 = CAR_HEIGHT / 2 * Math.cos(-angle + Math.PI / 2);
  const y1 = CAR_HEIGHT / 2 * Math.sin(-angle + Math.PI / 2);
  const x2 = CAR_WIDTH / 2 * Math.cos(-angle);
  const y2 = CAR_WIDTH / 2 * Math.sin(-angle);
  return isThereAnyColor(data, cx - x1 - x2, cy + y1 + y2) || isThereAnyColor(data, cx + x1 + x2, cy - y1 - y2) || isThereAnyColor(data, cx - x1 + x2, cy + y1 - y2) || isThereAnyColor(data, cx + x1 - x2, cy - y1 + y2) || false;
};
var restartIfCarsTooFarAway = (level2, car12, car22) => {
  const deltaX = Math.abs(car12.centerX - car22.centerX);
  const deltaY = Math.abs(car12.centerY - car22.centerY);
  if (deltaX > CAMERA_WIDTH || deltaY > CAMERA_HEIGHT) {
    const checkpointLocation = level2.pathPoints[level2.lastCheckpointReachedIndex];
    const nextCheckpointLocation = level2.pathPoints[level2.lastCheckpointReachedIndex + 1];
    let rotateToNextCheckpointAngleDegrees = 0;
    if (nextCheckpointLocation) {
      const differenceX = nextCheckpointLocation.x - checkpointLocation.x;
      const differenceY = -(nextCheckpointLocation.y - checkpointLocation.y);
      const radians = Math.atan2(differenceY, differenceX);
      rotateToNextCheckpointAngleDegrees = -radians + Math.PI / 2;
      car12.rotation = car22.rotation = rotateToNextCheckpointAngleDegrees;
    }
    const matrix = new DOMMatrix(`rotate(${rotateToNextCheckpointAngleDegrees || 0}rad) translate(${CAR_WIDTH}px, 0)`);
    const car1Point = matrix.transformPoint(new DOMPoint(0, 0));
    car12.centerX = car1Point.x + checkpointLocation.x;
    car12.centerY = car1Point.y + checkpointLocation.y;
    const car2Point = matrix.transformPoint(new DOMPoint(0, 0));
    car22.centerX = -car2Point.x + checkpointLocation.x;
    car22.centerY = -car2Point.y + checkpointLocation.y;
    car12.velocityX = car12.velocityY = car22.velocityX = car22.velocityY = 0;
  }
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
var calculatePathProgress = (gameDiv2, level2, car12, car22) => {
  updateCheckpointForCar(level2, car12);
  updateCheckpointForCar(level2, car22);
  const sharedCheckpointIndex = Math.min(car12.lastCheckpointIndex, car22.lastCheckpointIndex);
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
var updateCameraPosition = (gameDiv2, car12, car22) => {
  const cameraCenterX = (car12.centerX + car22.centerX) / 2;
  const cameraCenterY = (car12.centerY + car22.centerY) / 2;
  gameDiv2.scrollLeft = cameraCenterX - CAMERA_WIDTH / 2;
  gameDiv2.scrollTop = cameraCenterY - CAMERA_HEIGHT / 2;
};

// src/main.ts
var gameDiv = document.getElementById("game");
gameDiv.style.setProperty("--width", `${CAMERA_WIDTH}px`);
gameDiv.style.setProperty("--height", `${CAMERA_HEIGHT}px`);
var level = await downloadLevel();
gameDiv.appendChild(level.visual);
var car1 = createCar(100, 50, "green", gameDiv);
var car2 = createCar(5e3, 50, "blue", gameDiv);
var previous = performance.now();
var update = (time) => {
  const delta = time - previous;
  previous = time;
  updatePositionCar(level, car1, delta);
  updatePositionCar(level, car2, delta);
  calculatePathProgress(gameDiv, level, car1, car2);
  restartIfCarsTooFarAway(level, car1, car2);
  updateVisuals(car1);
  updateVisuals(car2);
  updateCameraPosition(gameDiv, car1, car2);
  requestAnimationFrame(update);
};
requestAnimationFrame(update);
var handleKey = (key, pressed) => {
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
document.body.addEventListener(
  "keydown",
  (event) => handleKey(event.code, true)
);
document.body.addEventListener(
  "keyup",
  (event) => handleKey(event.code, false)
);
