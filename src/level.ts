import { GAME_HEIGHT, GAME_WIDTH } from "./constants";

export interface Level {
  obstacles: Uint8ClampedArray;
  road: Uint8ClampedArray;
  visual: HTMLCanvasElement;
}

const getSourceFilterGroup = (content: string, name: string): string => {
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

const TEXTURE_DATA_DIVISOR = 2;
const extractTextureData = async (svgContent: string, groupName: string) => {
  const svg = getSourceFilterGroup(svgContent, groupName);
  const img = await createImage("data:image/svg+xml;base64," + btoa(svg));

  const canvas = document.createElement("canvas");
  canvas.width = (GAME_WIDTH / TEXTURE_DATA_DIVISOR) | 0;
  canvas.height = (GAME_HEIGHT / TEXTURE_DATA_DIVISOR) | 0;

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

const extractVisualCanvas = async (svgContent: string) => {
  const svg = getSourceFilterGroup(svgContent, "visible");
  const img = await createImage("data:image/svg+xml;base64," + btoa(svg));

  const canvas = document.createElement("canvas");
  canvas.width = GAME_WIDTH;
  canvas.height = GAME_HEIGHT;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  return canvas;
};

export const downloadLevel = async (): Promise<Level> => {
  const content = await (await fetch("./level.svg")).text();

  return {
    obstacles: await extractTextureData(content, "obstacles"),
    road: await extractTextureData(content, "road"),
    visual: await extractVisualCanvas(content),
  };
};
export const isThereAnyColor = (
  data: Uint8ClampedArray,
  x: number,
  y: number
): boolean => {
  if (x < 0 || y < 0 || x >= GAME_WIDTH || y >= GAME_HEIGHT) return true;

  const pixelIndex =
    ((x / TEXTURE_DATA_DIVISOR) | 0) +
    ((y / TEXTURE_DATA_DIVISOR) | 0) * GAME_WIDTH;
  const isInRed = data[pixelIndex] > 0;

  return isInRed;
};
