// imageAnalyzer.js: free local OCR (tesseract.js) + color analysis (sharp) of screenshots
// the result helps the Coder rebuild a design instead of inventing text and colors
import sharp from "sharp";
import os from "node:os";
import path from "node:path";
import { createWorker } from "tesseract.js";

// ---- limits ----
const OCR_MIN_CONFIDENCE = 55;
const OCR_MIN_CHARS = 2;
const OCR_MAX_LINES = 150;
const OCR_MAX_CHARS = 6000;
const OCR_TIMEOUT = 25000;
const ANALYSIS_MAX_CHARS = 9000;
const OCR_TARGET_WIDTH = 1600;
const OCR_MAX_UPSCALE = 3;

// one lazily created tesseract worker, reused for every image
let workerPromise = null;
const getWorker = () => {
  if (!workerPromise) {
    workerPromise = createWorker("eng", 1, {
      cachePath: path.join(os.tmpdir(), "drexel-tessdata"),
    }).then(async (worker) => {
      // 11 = sparse text: finds short labels scattered on a UI screenshot
      await worker.setParameters({ tessedit_pageseg_mode: "11" });
      return worker;
    });
  }
  return workerPromise;
};

// simple queue: OCR jobs run one at a time to keep memory bounded
let queue = Promise.resolve();
const enqueueOcr = (job) => {
  const run = queue.then(async () => {
    const worker = await getWorker();
    return job(worker);
  });
  // a failing job must not break the queue for the next image
  queue = run.then(() => undefined, () => undefined);
  return run;
};

const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(null), ms)),
  ]);

// hex helper for the 0..255 channel values
const hex = (value) => value.toString(16).padStart(2, "0");

// prepare for OCR: grayscale, normalise, ~1600px wide (upscale at most 3x),
// negated when the UI is dark so the text becomes dark on light
const prepareForOcr = async (buffer, luminance, width) => {
  const scale = Math.min(OCR_MAX_UPSCALE, OCR_TARGET_WIDTH / width);
  const pipeline = sharp(buffer)
    .clone()
    .resize(Math.round(width * scale))
    .greyscale()
    .normalise();
  return luminance < 0.5 ? pipeline.negate() : pipeline;
};

// flatten the tesseract blocks (v6+: block.paragraphs[].lines[]) into plain lines
const collectLines = (blocks = []) => {
  const lines = [];
  for (const block of blocks) {
    for (const paragraph of block.paragraphs || []) {
      for (const line of paragraph.lines || []) {
        lines.push(line);
      }
    }
    // some versions put lines directly on the block
    if (!block.paragraphs) lines.push(...(block.lines || []));
  }
  return lines.filter((line) => line?.bbox);
};

// formats OCR lines as "[x%,y%] text", sorted top to bottom, left to right
const formatOcrText = (lines, width, height) => {
  const kept = lines
    .filter(
      (line) =>
        (line.confidence || 0) >= OCR_MIN_CONFIDENCE &&
        (line.text || "").trim().length >= OCR_MIN_CHARS,
    )
    .sort(
      (a, b) => (a.bbox.y0 - b.bbox.y0) * 1000 + (a.bbox.x0 - b.bbox.x0),
    );

  let out = "";
  let count = 0;
  for (const line of kept) {
    if (count >= OCR_MAX_LINES) break;
    const x = Math.round((line.bbox.x0 / width) * 100);
    const y = Math.round((line.bbox.y0 / height) * 100);
    const entry = `[${x}%,${y}%] ${line.text.trim().replace(/\s+/g, " ").slice(0, 300)}\n`;
    if (out.length + entry.length > OCR_MAX_CHARS) break;
    out += entry;
    count++;
  }
  return out.trim();
};

// PALETTE: quantize every channel to 16 levels and keep the top 8 shares (>= 1%)
const buildPalette = async (buffer) => {
  const { data, info } = await sharp(buffer)
    .clone()
    .removeAlpha()
    .resize(64, 36, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const counts = new Map();
  for (let i = 0; i < data.length; i += info.channels) {
    // 16 levels per channel -> one byte key per color
    const key = (data[i] >> 4) << 8 | (data[i + 1] >> 4) << 4 | (data[i + 2] >> 4);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const total = info.width * info.height;

  return [...counts.entries()]
    .filter(([, n]) => n / total >= 0.01)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([key, n]) => {
      const r = ((key >> 8) & 15) * 17;
      const g = ((key >> 4) & 15) * 17;
      const b = (key & 15) * 17;
      return `#${hex(r)}${hex(g)}${hex(b)} ${Math.round((n / total) * 100)}%`;
    })
    .join(", ");
};

// COLOR MAP: the image squeezed to a 12x8 pixel grid, printed row by row
// so the Coder sees where sidebar, header, cards and accents sit
const buildColorMap = async (buffer) => {
  const { data } = await sharp(buffer)
    .clone()
    .removeAlpha()
    .resize(12, 8, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let map = "";
  for (let row = 0; row < 8; row++) {
    const cells = [];
    for (let col = 0; col < 12; col++) {
      const i = (row * 12 + col) * 3;
      cells.push(`#${hex(data[i])}${hex(data[i + 1])}${hex(data[i + 2])}`);
    }
    map += `row ${row + 1}: ${cells.join(" ")}\n`;
  }
  return map;
};

// the real work; analyzeImage never throws, it returns "" on any failure
const runAnalysis = async (buffer) => {
  const metadata = await sharp(buffer).metadata();
  const width = metadata.width || 1600;
  const height = metadata.height || 900;

  // theme (light or dark) from the average luminance of the original image
  const grey = await sharp(buffer).clone().greyscale().stats();
  const luminance = (grey.channels[0]?.mean ?? 128) / 255;
  const theme = luminance >= 0.5 ? "light" : "dark";

  // OCR text with line positions
  let textBlock = "";
  try {
    const prepared = await prepareForOcr(buffer, luminance, width).toBuffer();
    const result = await withTimeout(
      enqueueOcr((worker) => worker.recognize(prepared, {}, { text: true, blocks: true })),
      OCR_TIMEOUT,
    );
    if (result) {
      const lines = collectLines(result?.data?.blocks || []);
      textBlock = formatOcrText(lines, width, height) || "none detected";
    } else {
      textBlock = "none detected (OCR timed out)";
    }
  } catch {
    textBlock = "none detected (OCR failed)";
  }

  const [palette, colorMap] = await Promise.all([
    buildPalette(buffer),
    buildColorMap(buffer),
  ]);

  return [
    `IMAGE ANALYSIS (computed by code, exact): size ${width}x${height}, THEME: ${theme}`,
    `PALETTE: ${palette}`,
    `COLOR MAP (12x8 grid, row 1 = top):`,
    colorMap,
    `TEXT:`,
    textBlock,
  ]
    .join("\n")
    .slice(0, ANALYSIS_MAX_CHARS);
};

export const analyzeImage = async (buffer) => {
  if (!buffer) return "";
  try {
    return await Promise.race([
      runAnalysis(buffer),
      new Promise((resolve) => setTimeout(() => resolve(""), OCR_TIMEOUT + 10000)),
    ]);
  } catch {
    return "";
  }
};
