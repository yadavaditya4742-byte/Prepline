// Copies the on-device OCR engine (Tesseract, Apache-2.0) into public/ocr so receipt scanning
// works without any third-party CDN. Runs automatically before dev and build.
import { copyFile, mkdir } from 'node:fs/promises';
const out = new URL('../public/ocr/', import.meta.url);
await mkdir(out, { recursive: true });
const files = [
  ['node_modules/tesseract.js/dist/worker.min.js', 'worker.min.js'],
  ['node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js', 'tesseract-core-lstm.wasm.js'],
  ['node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js'],
  ['node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js', 'tesseract-core-relaxedsimd-lstm.wasm.js'],
  ['node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', 'eng.traineddata.gz'],
];
for (const [from, to] of files) await copyFile(new URL(`../${from}`, import.meta.url), new URL(to, out));
console.log(`OCR engine copied to public/ocr (${files.length} files)`);
