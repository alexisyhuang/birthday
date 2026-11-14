const SAMPLE_WIDTH = 96;
const MATCH_RADIUS = 4;

type InkMask = { width: number; height: number; pixels: Uint8Array; count: number };

function makeMask(source: HTMLCanvasElement, height: number, isInk: (r: number, g: number, b: number, a: number) => boolean): InkMask {
  const sample = document.createElement('canvas');
  sample.width = SAMPLE_WIDTH;
  sample.height = height;
  const context = sample.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas scoring is unavailable in this browser.');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, SAMPLE_WIDTH, height);
  context.drawImage(source, 0, 0, SAMPLE_WIDTH, height);
  const data = context.getImageData(0, 0, SAMPLE_WIDTH, height).data;
  const pixels = new Uint8Array(SAMPLE_WIDTH * height);
  let count = 0;
  for (let p = 0, i = 0; p < data.length; p += 4, i++) {
    if (isInk(data[p], data[p + 1], data[p + 2], data[p + 3])) {
      pixels[i] = 1;
      count++;
    }
  }
  return { width: SAMPLE_WIDTH, height, pixels, count };
}

function makeReferenceMask(image: HTMLImageElement, sampleHeight: number): InkMask {
  const source = document.createElement('canvas');
  source.width = image.naturalWidth;
  source.height = image.naturalHeight;
  const context = source.getContext('2d');
  if (!context) throw new Error('Canvas scoring is unavailable in this browser.');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, source.width, source.height);
  context.drawImage(image, 0, 0, source.width, source.height);
  return makeMask(source, sampleHeight, (r, g, b, a) => a > 24 && r < 165 && g < 165 && b < 165);
}

function makeDrawingMask(canvas: HTMLCanvasElement, sampleHeight: number): InkMask {
  return makeMask(canvas, sampleHeight, (r, g, b, a) => a > 24 && (r < 220 || g < 220 || b < 220));
}

function matchedPixels(source: InkMask, target: InkMask): number {
  let matches = 0;
  for (let y = 0; y < source.height; y++) {
    for (let x = 0; x < source.width; x++) {
      if (!source.pixels[y * source.width + x]) continue;
      let found = false;
      for (let dy = -MATCH_RADIUS; dy <= MATCH_RADIUS && !found; dy++) {
        for (let dx = -MATCH_RADIUS; dx <= MATCH_RADIUS; dx++) {
          if (dx * dx + dy * dy > MATCH_RADIUS * MATCH_RADIUS) continue;
          const tx = x + dx;
          const ty = y + dy;
          if (tx >= 0 && tx < target.width && ty >= 0 && ty < target.height && target.pixels[ty * target.width + tx]) {
            found = true;
            break;
          }
        }
      }
      if (found) matches++;
    }
  }
  return matches;
}

/** Tolerant symmetric line-mask overlap, normalized to a 0–100 similarity score. */
export function scoreDrawing(reference: HTMLImageElement, drawing: HTMLCanvasElement): number {
  const sampleHeight = Math.max(48, Math.round(SAMPLE_WIDTH * reference.naturalHeight / reference.naturalWidth));
  const target = makeReferenceMask(reference, sampleHeight);
  const sketch = makeDrawingMask(drawing, sampleHeight);
  if (!target.count || !sketch.count) return 0;
  const precision = matchedPixels(sketch, target) / sketch.count;
  const recall = matchedPixels(target, sketch) / target.count;
  const f1 = precision + recall === 0 ? 0 : 2 * precision * recall / (precision + recall);
  return Math.round(Math.max(0, Math.min(100, f1 * 100)));
}
