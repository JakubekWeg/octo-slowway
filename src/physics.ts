import { Car } from "./car";
import {
  CAMERA_HEIGHT,
  CAMERA_WIDTH,
  CAR_HEIGHT,
  CAR_WIDTH,
} from "./constants";
import { Level, Point, isThereAnyColor } from "./level";

const distanceSquared = (ax: number, ay: number, bx: number, by: number) => {
  return (ax - bx) ** 2 + (ay - by) ** 2
}

export const updatePositionCar = (level: Level, car: Car, delta: number, otherCarPosition: Point | undefined) => {
  const isOnRoad = checkIfInObstacle(
    level.road,
    car.centerX,
    car.centerY,
    car.rotation
  );

  const grip = isOnRoad ? car.stats.gripRoad : car.stats.gripGround;
  car.velocityX -=
    car.velocityX *
    (isOnRoad ? car.stats.dragRoad : car.stats.dragGround) *
    delta *
    (1 - Math.abs(Math.sin(-car.rotation)) * grip);
  car.velocityY -=
    car.velocityY *
    (isOnRoad ? car.stats.dragRoad : car.stats.dragGround) *
    delta *
    (1 - Math.abs(Math.cos(-car.rotation)) * grip);

  const acceleration = isOnRoad
    ? car.stats.accelerationRoad
    : car.stats.accelerationGround;

  let addedAcceleration = 0;

  if (car.gasPressed) addedAcceleration += acceleration * delta;
  if (car.breakPressed) addedAcceleration -= acceleration * delta;

  let newRotation = car.rotation;
  const turnSpeed = car.stats.turnSpeed
  const currentVelocity = Math.sqrt(
    car.velocityX * car.velocityX + car.velocityY * car.velocityY
  );
  if (car.left) newRotation -= Math.PI * turnSpeed * delta * currentVelocity;
  if (car.right) newRotation += Math.PI * turnSpeed * delta * currentVelocity;

  car.velocityX += addedAcceleration * Math.cos(-car.rotation + Math.PI / 2);
  car.velocityY += addedAcceleration * Math.sin(-car.rotation + Math.PI / 2);

  const newCenterX = car.centerX + car.velocityX * delta;
  const newCenterY = car.centerY - car.velocityY * delta;
  const crashed = checkIfInObstacle(
    level.obstacles,
    newCenterX,
    newCenterY,
    car.rotation
  ) || (otherCarPosition ? checkIfCarsTooNear({ x: newCenterX, y: newCenterY }, otherCarPosition) : false);

  if (crashed) {
    car.velocityX *= -0.2;
    car.velocityY *= -0.2;
    if (currentVelocity > 0.2) {
      car.crashed = true
    }
  } else {
    car.centerX = newCenterX;
    car.centerY = newCenterY;
    car.rotation = newRotation;
  }
};

const checkIfInObstacle = (
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

const checkIfCarsTooNear = (
  a: Point, b: Point
): boolean => {
  return distanceSquared(a.x, a.y, b.x, b.y) < CAR_WIDTH * CAR_HEIGHT;
};

export const restartIfCarsTooFarAway = (level: Level, car1: Car, car2: Car): boolean => {
  const deltaX = Math.abs(car1.centerX - car2.centerX)
  const deltaY = Math.abs(car1.centerY - car2.centerY)

  if (deltaX > CAMERA_WIDTH || deltaY > CAMERA_HEIGHT || car1 === car2) {
    restartCarsFromCheckpoints(level, car1, car2);
    return true
  }
  return false
}

export const updateCheckpointForCar = (level: Level, car: Car) => {
  const lastPoint = level.pathPoints[car.lastCheckpointIndex]
  const nextPoint = level.pathPoints[car.lastCheckpointIndex + 1]

  if (!nextPoint) return

  if (distanceSquared(car.centerX, car.centerY, nextPoint.x, nextPoint.y) < distanceSquared(car.centerX, car.centerY, lastPoint.x, lastPoint.y)) {
    car.lastCheckpointIndex = car.lastCheckpointIndex + 1
  }
}

export const calculatePathProgress = (gameDiv: HTMLElement, level: Level, car1: Car, car2: Car) => {
  updateCheckpointForCar(level, car1)
  if (car1 !== car2)
    updateCheckpointForCar(level, car2)

  const sharedCheckpointIndex = Math.min(car1.lastCheckpointIndex, car2.lastCheckpointIndex)

  if (level.lastCheckpointReachedIndex !== sharedCheckpointIndex) {
    level.lastCheckpointReachedIndex = sharedCheckpointIndex

    for (const element of document.getElementsByClassName('checkpoint')) {
      element.classList.remove('active')
      element.classList.add('inactive')
    }

    const checkpoint = document.createElement('div')
    checkpoint.classList.add('checkpoint')
    const point = level.pathPoints[sharedCheckpointIndex]
    checkpoint.style.setProperty('--x', `${point.x}px`)
    checkpoint.style.setProperty('--y', `${point.y}px`)
    gameDiv.appendChild(checkpoint)

    requestAnimationFrame(() => {
      checkpoint.classList.toggle('active')
    })
  }
}

export const updateCameraPosition = (gameDiv: HTMLElement, car1: Car, car2: Car) => {

  const cameraCenterX = (car1.centerX + car2.centerX) / 2;
  const cameraCenterY = (car1.centerY + car2.centerY) / 2;

  gameDiv.scrollLeft = cameraCenterX - CAMERA_WIDTH / 2;
  gameDiv.scrollTop = cameraCenterY - CAMERA_HEIGHT / 2;
}

export const restartCarsFromCheckpoints = (level: Level, car1: Car, car2: Car) => {
  car1.crashed = car2.crashed = false
  const checkpointLocation = level.pathPoints[level.lastCheckpointReachedIndex]

  const nextCheckpointLocation = level.pathPoints[level.lastCheckpointReachedIndex + 1]
  let rotateToNextCheckpointAngleDegrees = 0
  if (nextCheckpointLocation) {
    const differenceX = nextCheckpointLocation.x - checkpointLocation.x
    const differenceY = -(nextCheckpointLocation.y - checkpointLocation.y)

    const radians = Math.atan2(differenceY, differenceX)

    rotateToNextCheckpointAngleDegrees = (-radians + Math.PI / 2)
    car1.rotation = car2.rotation = rotateToNextCheckpointAngleDegrees
  }

  const matrix = new DOMMatrix(`rotate(${rotateToNextCheckpointAngleDegrees || 0}rad) translate(${CAR_WIDTH}px, 0)`)
  const car1Point = matrix.transformPoint(new DOMPoint(0, 0))
  car1.centerX = car1Point.x + checkpointLocation.x
  car1.centerY = car1Point.y + checkpointLocation.y

  const car2Point = matrix.transformPoint(new DOMPoint(0, 0))
  car2.centerX = -car2Point.x + checkpointLocation.x
  car2.centerY = -car2Point.y + checkpointLocation.y

  car1.velocityX = car1.velocityY = car2.velocityX = car2.velocityY = 0
  car1.lastCheckpointIndex = car2.lastCheckpointIndex = level.lastCheckpointReachedIndex
}
export const gameIsOver = (level: Level): boolean => {
  if (level.lastCheckpointReachedIndex >= level.pathPoints.length - 1) {
    return true
  }
  return false
}
export const getCurrentLap = (level: Level): number => {
  return Math.ceil(level.lastCheckpointReachedIndex / level.pointsPerLap)
}