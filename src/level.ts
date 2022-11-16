import { GAME_HEIGHT, GAME_WIDTH } from "./constants";

export interface Level {
  obstacles: Uint8ClampedArray;
}

const getSourceFilterGroup = (
  content: string,
  name: "visible" | "physics"
): string => {
  const svgDoc = new DOMParser().parseFromString(content, "image/svg+xml");
  [...svgDoc.querySelectorAll(`svg>g`)]
    .filter((e) => e.getAttribute("inkscape:label") !== name)
    .forEach((e) => e.remove());

  return new XMLSerializer().serializeToString(svgDoc);
};

const createImage = (src: string) => {
  const img = document.createElement("img");
  img.src = src;

  return new Promise<HTMLImageElement>(
    (resolve) => (img.onload = () => resolve(img))
  );
};

const extractObstacleData = async (svgContent: string) => {
  const svg = getSourceFilterGroup(svgContent, "physics");
  const img = await createImage("data:image/svg+xml;base64," + btoa(svg));

  const canvas = document.createElement("canvas");
  canvas.width = GAME_WIDTH;
  canvas.height = GAME_HEIGHT;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, GAME_WIDTH, GAME_HEIGHT);
  const pixelsCount = data.length / 4;
  const redData = new Uint8ClampedArray(pixelsCount);
  for (let i = 0, l = pixelsCount; i < l; ++i) {
    redData[i] = data[i * 4];
  }

  return redData;
};

export const downloadLevel = async (): Promise<Level> => {
  const content = await (await fetch("./level.svg")).text();

  return {
    obstacles: await extractObstacleData(content),
  };
};
export const isThereAnyColor = (
  data: Uint8ClampedArray,
  x: number,
  y: number
): boolean => {
  if (x < 0 || y < 0 || x >= GAME_WIDTH || y >= GAME_HEIGHT) return true;

  const pixelIndex = (x | 0) + (y | 0) * GAME_WIDTH;
  const isInRed = data[pixelIndex] > 0;

  return isInRed;
};
