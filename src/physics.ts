import { Car } from "./car";
import {
  CAMERA_HEIGHT,
  CAMERA_WIDTH,
  CAR_ACCELERATION_GROUND,
  CAR_ACCELERATION_ROAD,
  CAR_GRIP_PERCENTAGE_GROUND,
  CAR_GRIP_PERCENTAGE_ROAD,
  CAR_HEIGHT,
  CAR_WIDTH,
  DRAG_GROUND,
  DRAG_ROAD,
  TURN_SPEED_GROUND,
  TURN_SPEED_ROAD
} from "./constants";
import { isThereAnyColor, Level } from "./level";

const distanceSquared = (ax: number, ay: number, bx: number, by: number) => {
  return (ax - bx) ** 2 + (ay - by) ** 2
}

export const updatePositionCar = (level: Level, car: Car, delta: number) => {
  const isOnRoad = checkCarPosition(
    level.road,
    car.centerX,
    car.centerY,
    car.rotation
  );

  const grip = isOnRoad ? CAR_GRIP_PERCENTAGE_ROAD : CAR_GRIP_PERCENTAGE_GROUND;
  car.velocityX -=
    car.velocityX *
    (isOnRoad ? DRAG_ROAD : DRAG_GROUND) *
    delta *
    (1 - Math.abs(Math.sin(-car.rotation)) * grip);
  car.velocityY -=
    car.velocityY *
    (isOnRoad ? DRAG_ROAD : DRAG_GROUND) *
    delta *
    (1 - Math.abs(Math.cos(-car.rotation)) * grip);

  const acceleration = isOnRoad
    ? CAR_ACCELERATION_ROAD
    : CAR_ACCELERATION_GROUND;

  let addedAcceleration = 0;

  if (car.gasPressed) addedAcceleration += acceleration * delta;
  if (car.breakPressed) addedAcceleration -= acceleration * delta;

  let newRotation = car.rotation;
  const turnSpeed = isOnRoad ? TURN_SPEED_ROAD : TURN_SPEED_GROUND;
  const currentVelocity = Math.sqrt(
    car.velocityX * car.velocityX + car.velocityY * car.velocityY
  );
  if (car.left) newRotation -= Math.PI * turnSpeed * delta * currentVelocity;
  if (car.right) newRotation += Math.PI * turnSpeed * delta * currentVelocity;

  car.velocityX += addedAcceleration * Math.cos(-car.rotation + Math.PI / 2);
  car.velocityY += addedAcceleration * Math.sin(-car.rotation + Math.PI / 2);

  const newCenterX = car.centerX + car.velocityX * delta;
  const newCenterY = car.centerY - car.velocityY * delta;
  const crashed = checkCarPosition(
    level.obstacles,
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

const checkCarPosition = (
  data: Uint8ClampedArray,
  cx: number,
  cy: number,
  angle: number
): boolean => {
  const x1 = (CAR_HEIGHT / 2) * Math.cos(-angle + Math.PI / 2);
  const y1 = (CAR_HEIGHT / 2) * Math.sin(-angle + Math.PI / 2);
  const x2 = (CAR_WIDTH / 2) * Math.cos(-angle);
  const y2 = (CAR_WIDTH / 2) * Math.sin(-angle);
  return (
    isThereAnyColor(data, cx - x1 - x2, cy + y1 + y2) || // back left
    isThereAnyColor(data, cx + x1 + x2, cy - y1 - y2) || // front right
    isThereAnyColor(data, cx - x1 + x2, cy + y1 - y2) || // back right
    isThereAnyColor(data, cx + x1 - x2, cy - y1 + y2) || // front left
    false
  );
};

export const restartIfCarsTooFarAway = (level: Level, car1: Car, car2: Car) => {
  const deltaX = Math.abs(car1.centerX - car2.centerX)
  const deltaY = Math.abs(car1.centerY - car2.centerY)


  if (deltaX > CAMERA_WIDTH / 2 || deltaY > CAMERA_HEIGHT / 2) {
    car1.centerX = car2.centerX
    car1.centerY = car2.centerY
    car1.velocityX = car1.velocityY = car2.velocityX = car2.velocityY = 0
    console.log('teleport!');

  }
}


export const calculatePathProgress = (level: Level, car1: Car, car2: Car) => {
  let closestPoint = level.pathPoints[0]
  let closestDistanceSquared = Number.MAX_VALUE
  for (const p of level.pathPoints) {
    const distance = distanceSquared(car1.centerX, car1.centerY, p.x, p.y)
    if (distance < closestDistanceSquared) {
      closestPoint = p
      closestDistanceSquared = distance
    }
  }

  car2.centerX = closestPoint.x
  car2.centerY = closestPoint.y
}