export interface CropArea {
  height: number;
  width: number;
  x: number;
  y: number;
}

export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const ACCEPTED_IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
] as const;

export const MAX_SOURCE_BYTES = 2 * 1024 * 1024;

const OUTPUT_SIZE = 512;

export function cropToBlob(
  bitmap: ImageBitmap,
  area: CropArea,
  outputType: string,
) {
  const size = Math.min(OUTPUT_SIZE, Math.round(area.width));

  const canvas = createCanvas(size);

  // The canvas union widens `getContext('2d')` to every rendering context, so
  // the 2D one has to be named back explicitly.
  const context = canvas.getContext('2d') as
    | CanvasRenderingContext2D
    | null
    | OffscreenCanvasRenderingContext2D;

  if (!context) {
    throw new Error('Canvas 2D context unavailable');
  }

  context.drawImage(
    bitmap,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    size,
    size,
  );

  return canvasToBlob(canvas, outputType);
}

export async function decodeImage(file: Blob) {
  try {
    return await createImageBitmap(file);
  } catch {
    return null;
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  outputType: string,
) {
  if (canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({
      type: outputType,
    });
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to encode the cropped image'));

        return;
      }

      resolve(blob);
    }, outputType);
  });
}

function createCanvas(size: number) {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(size, size);
  }

  const canvas = document.createElement('canvas');

  canvas.width = size;
  canvas.height = size;

  return canvas;
}
