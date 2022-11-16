// src/main.ts
var GAME_WIDTH = 700;
var GAME_HEIGHT = 500;
var gameDiv = document.getElementById("game");
gameDiv.style.setProperty("--width", `${GAME_WIDTH}px`);
gameDiv.style.setProperty("--height", `${GAME_HEIGHT}px`);
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
var parseLevel = async () => {
  const content = await (await fetch("./level.svg")).text();
  const visible = getSourceFilterGroup(content, "visible");
  const img = await createImage("data:image/svg+xml;base64," + btoa(visible));
  const canvas = document.createElement("canvas");
  canvas.width = GAME_WIDTH;
  canvas.height = GAME_HEIGHT;
  gameDiv.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
};
await parseLevel();
var car = {
  element: document.createElement("div"),
  positionX: 100,
  positionY: 50,
  rotation: 0,
  velocityX: 0,
  velocityY: 0,
  gasPressed: false,
  breakPressed: false
};
car.element.classList.add("car");
gameDiv.appendChild(car.element);
setInterval(() => {
  if (car.gasPressed)
    car.velocityY += 0.1;
  if (car.breakPressed)
    car.velocityY -= 0.2;
  car.velocityX *= 0.95;
  car.velocityY *= 0.95;
  car.positionX -= car.velocityX;
  car.positionY -= car.velocityY;
  car.element.style.setProperty("--x", `${car.positionX | 0}px`);
  car.element.style.setProperty("--y", `${car.positionY | 0}px`);
  car.element.style.setProperty("--angle", `${car.rotation}rad`);
}, 30);
document.body.addEventListener("keydown", (event) => {
  const key = event.code;
  switch (key) {
    case "ArrowUp":
      car.gasPressed = true;
      break;
    case "ArrowDown":
      car.breakPressed = true;
      break;
  }
});
document.body.addEventListener("keyup", (event) => {
  const key = event.code;
  switch (key) {
    case "ArrowUp":
      car.gasPressed = false;
      break;
    case "ArrowDown":
      car.breakPressed = false;
      break;
  }
});
