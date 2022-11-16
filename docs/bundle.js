// src/constants.ts
var GAME_WIDTH = 1400;
var GAME_HEIGHT = 1e3;
var CAR_WIDTH = 40;
var CAR_HEIGHT = 80;
var CAMERA_WIDTH = 700;
var CAMERA_HEIGHT = 700;
var CAR_ACCELERATION_ROAD = 2e-3;
var CAR_ACCELERATION_GROUND = 15e-4;
var DRAG_ROAD = 5e-3;
var DRAG_GROUND = 9e-3;
var TURN_SPEED_ROAD = 5e-3;
var TURN_SPEED_GROUND = 3e-3;

// src/car.ts
var createElement = (root, color) => {
  const car = document.createElement("div");
  car.classList.add("car");
  car.style.setProperty("--width", `${CAR_WIDTH | 0}px`);
  car.style.setProperty("--height", `${CAR_HEIGHT | 0}px`);
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
    velocity: 0,
    gasPressed: false,
    breakPressed: false,
    right: false,
    left: false
  };
};
var updateVisuals = (car) => {
  car.element.style.setProperty("--x", `${car.centerX | 0}px`);
  car.element.style.setProperty("--y", `${car.centerY | 0}px`);
  car.element.style.setProperty("--angle", `${car.rotation}rad`);
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
var downloadLevel = async () => {
  const content = await (await fetch("./level.svg")).text();
  return {
    obstacles: await extractTextureData(content, "obstacles"),
    road: await extractTextureData(content, "road"),
    visual: await extractVisualCanvas(content)
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
var updatePositionCar = (level2, car, delta) => {
  const isOnRoad = checkCarPosition(
    level2.road,
    car.centerX,
    car.centerY,
    car.rotation
  );
  car.velocity -= car.velocity * (isOnRoad ? DRAG_ROAD : DRAG_GROUND) * delta;
  const acceleration = isOnRoad ? CAR_ACCELERATION_ROAD : CAR_ACCELERATION_GROUND;
  if (car.gasPressed)
    car.velocity += acceleration * delta;
  if (car.breakPressed)
    car.velocity -= acceleration * delta;
  let newRotation = car.rotation;
  const turnSpeed = isOnRoad ? TURN_SPEED_ROAD : TURN_SPEED_GROUND;
  if (car.left)
    newRotation -= Math.PI * turnSpeed * delta * car.velocity;
  if (car.right)
    newRotation += Math.PI * turnSpeed * delta * car.velocity;
  const velocityX = car.velocity * Math.cos(-car.rotation + Math.PI / 2);
  const velocityY = car.velocity * Math.sin(-car.rotation + Math.PI / 2);
  const newCenterX = car.centerX + velocityX * delta;
  const newCenterY = car.centerY - velocityY * delta;
  const crashed = checkCarPosition(
    level2.obstacles,
    newCenterX,
    newCenterY,
    car.rotation
  );
  if (crashed) {
    car.velocity *= -0.3;
    console.log("Hit", Math.abs(car.velocity) * 1e3 | 0);
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

// src/main.ts
var gameDiv = document.getElementById("game");
gameDiv.style.setProperty("--width", `${CAMERA_WIDTH}px`);
gameDiv.style.setProperty("--height", `${CAMERA_HEIGHT}px`);
var level = await downloadLevel();
gameDiv.appendChild(level.visual);
var car1 = createCar(100, 50, "green", gameDiv);
var car2 = createCar(50, 50, "blue", gameDiv);
var previous = performance.now();
var update = (time) => {
  const delta = time - previous;
  previous = time;
  updatePositionCar(level, car1, delta);
  updatePositionCar(level, car2, delta);
  updateVisuals(car1);
  updateVisuals(car2);
  gameDiv.scrollLeft = car1.centerX - CAMERA_WIDTH / 2;
  gameDiv.scrollTop = car1.centerY - CAMERA_HEIGHT / 2;
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
