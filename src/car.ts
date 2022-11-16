import { CAR_HEIGHT, CAR_WIDTH } from "./constants";

export interface Car {
  element: HTMLElement;
  centerX: number;
  centerY: number;
  rotation: number;
  velocity: number;
  gasPressed: boolean;
  breakPressed: boolean;
  right: boolean;
  left: boolean;
}

const createElement = (root: HTMLElement, color: string): HTMLElement => {
  const car = document.createElement("div");
  car.classList.add("car");
  car.style.setProperty("--width", `${CAR_WIDTH | 0}px`);
  car.style.setProperty("--height", `${CAR_HEIGHT | 0}px`);
  car.style.backgroundColor = color;
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
    velocity: 0,
    gasPressed: false,
    breakPressed: false,
    right: false,
    left: false,
  };
};

export const updateVisuals = (car: Car) => {
  car.element.style.setProperty("--x", `${car.centerX | 0}px`);
  car.element.style.setProperty("--y", `${car.centerY | 0}px`);
  car.element.style.setProperty("--angle", `${car.rotation}rad`);
};