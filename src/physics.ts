import { Car } from "./car";
import {
  CAR_ACCELERATION_GROUND,
  CAR_ACCELERATION_ROAD,
  CAR_HEIGHT,
  CAR_WIDTH,
  DRAG_GROUND,
  DRAG_ROAD,
  TURN_SPEED_GROUND,
  TURN_SPEED_ROAD,
} from "./constants";
import { isThereAnyColor, Level } from "./level";

export const updatePositionCar = (level: Level, car: Car, delta: number) => {
  const isOnRoad = checkCarPosition(
    level.road,
    car.centerX,
    car.centerY,
    car.rotation
  );

  car.velocity -= car.velocity * (isOnRoad ? DRAG_ROAD : DRAG_GROUND) * delta;

  const acceleration = isOnRoad
    ? CAR_ACCELERATION_ROAD
    : CAR_ACCELERATION_GROUND;

  if (car.gasPressed) car.velocity += acceleration * delta;
  if (car.breakPressed) car.velocity -= acceleration * delta;

  let newRotation = car.rotation;
  const turnSpeed = isOnRoad ? TURN_SPEED_ROAD : TURN_SPEED_GROUND;
  if (car.left) newRotation -= Math.PI * turnSpeed * delta * car.velocity;
  if (car.right) newRotation += Math.PI * turnSpeed * delta * car.velocity;

  const velocityX = car.velocity * Math.cos(-car.rotation + Math.PI / 2);
  const velocityY = car.velocity * Math.sin(-car.rotation + Math.PI / 2);

  const newCenterX = car.centerX + velocityX * delta;
  const newCenterY = car.centerY - velocityY * delta;
  const crashed = checkCarPosition(
    level.obstacles,
    newCenterX,
    newCenterY,
    car.rotation
  );

  if (crashed) {
    car.velocity *= -0.3;
    console.log("Hit", (Math.abs(car.velocity) * 1000) | 0);
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
