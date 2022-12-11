import { CAR_HEIGHT, CAR_WIDTH } from "./constants";

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
  x: number,
  y: number,
  color: string,
  root: HTMLElement
): Car => {
  return {
    element: createElement(root, color),
    centerX: x,
    centerY: y,
    rotation: 0.00001,
    velocityX: 0,
    velocityY: 0,
    gasPressed: false,
    breakPressed: false,
    right: false,
    left: false,
    crashed: false,
    lastCheckpointIndex: 0,
  };
};

export const updateVisuals = (car: Car) => {
  car.element.style.setProperty("--x", `${car.centerX.toFixed(2)}px`);
  car.element.style.setProperty("--y", `${car.centerY.toFixed(2)}px`);
  car.element.style.setProperty("--angle", `${car.rotation.toFixed(2)}rad`);
};
