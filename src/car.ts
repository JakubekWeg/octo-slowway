import { CAR_HEIGHT, CAR_WIDTH } from "./constants";

export interface CarStats {
  dragGround: number
  dragRoad: number
  gripGround: number
  gripRoad: number
  accelerationRoad: number
  accelerationGround: number
  turnSpeed: number
}

export interface Car {
  element: HTMLElement;
  centerX: number;
  centerY: number;
  rotation: number;
  velocityX: number;
  velocityY: number;
  gasPressed: boolean;
  breakPressed: boolean;
  right: boolean;
  left: boolean;
  crashed: boolean;
  lastCheckpointIndex: number;
  stats: CarStats
}

const createElement = (root: HTMLElement, color: string): HTMLElement => {
  const car = document.createElement("div");
  car.classList.add("car");
  car.style.setProperty("--width", `${CAR_WIDTH.toFixed(2)}px`);
  car.style.setProperty("--height", `${CAR_HEIGHT.toFixed(2)}px`);
  car.style.background = `url("car-${color}.png")`;
  root.appendChild(car);
  return car;
};

export const createCar = (
  stats: CarStats,
  x: number,
  y: number,
  color: string,
  root: HTMLElement
): Car => {
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
    stats,
  };
};

export const updateVisuals = (car: Car) => {
  car.element.style.setProperty("--x", `${car.centerX.toFixed(2)}px`);
  car.element.style.setProperty("--y", `${car.centerY.toFixed(2)}px`);
  car.element.style.setProperty("--angle", `${car.rotation.toFixed(2)}rad`);
};
