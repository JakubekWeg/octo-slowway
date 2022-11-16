import { Car } from "./car";
import { CAR_HEIGHT, CAR_WIDTH } from "./constants";
import { isThereAnyColor, Level } from "./level";

export const updatePositionCar = (level: Level, car: Car, delta: number) => {
  car.velocity -= car.velocity * 0.002 * delta;

  if (car.gasPressed) car.velocity += 0.001 * delta;
  if (car.breakPressed) car.velocity -= 0.0011 * delta;

  let newRotation = car.rotation;
  if (car.left) newRotation -= Math.PI * 0.002 * delta;
  if (car.right) newRotation += Math.PI * 0.002 * delta;

  const velocityX = car.velocity * Math.cos(-car.rotation + Math.PI / 2);
  const velocityY = car.velocity * Math.sin(-car.rotation + Math.PI / 2);

  const newCenterX = car.centerX + velocityX * delta;
  const newCenterY = car.centerY - velocityY * delta;
  const crashed = checkCarCrash(level, newCenterX, newCenterY, car.rotation);
  if (!crashed) {
    car.centerX = newCenterX;
    car.centerY = newCenterY;
    car.rotation = newRotation;
  }
};

const checkCarCrash = (
  level: Level,
  cx: number,
  cy: number,
  angle: number
): boolean => {
  const x1 = (CAR_HEIGHT / 2) * Math.cos(-angle + Math.PI / 2);
  const y1 = (CAR_HEIGHT / 2) * Math.sin(-angle + Math.PI / 2);
  const x2 = (CAR_WIDTH / 2) * Math.cos(-angle);
  const y2 = (CAR_WIDTH / 2) * Math.sin(-angle);
  return (
    isThereAnyColor(level.obstacles, cx - x1 - x2, cy + y1 + y2) || // back left
    isThereAnyColor(level.obstacles, cx + x1 + x2, cy - y1 - y2) || // front right
    isThereAnyColor(level.obstacles, cx - x1 + x2, cy + y1 - y2) || // back right
    isThereAnyColor(level.obstacles, cx + x1 - x2, cy - y1 + y2) || // front left
    false
  );
};
