/*
 * On-device receipt OCR (Tesseract, Apache-2.0). The engine and English model are
 * served from this app's own /ocr folder (see scripts/copy-ocr.mjs). Nothing is
 * uploaded. The engine loads only when someone scans, then is cached for offline use.
 */

/** Scale down huge phone photos and boost contrast, which helps OCR speed and accuracy. */
async function prepare(file: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const maxW = 1700;
  const scale = Math.min(1, maxW / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = g > 165 ? 255 : g < 90 ? 0 : (g - 90) * (255 / 75); // simple contrast stretch
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

export async function readReceiptImage(file: Blob, onProgress: (p: number, stage: string) => void): Promise<string> {
  onProgress(0.02, 'Loading the reader…');
  const { createWorker, OEM, PSM } = await import('tesseract.js');
  const base = new URL(`${import.meta.env.BASE_URL}ocr/`, location.href).href;
  const worker = await createWorker('eng', OEM.LSTM_ONLY, {
    workerPath: `${base}worker.min.js`,
    corePath: base,
    langPath: base,
    gzip: true,
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') onProgress(0.3 + m.progress * 0.7, 'Reading your receipt…');
      else if (m.status.includes('loading')) onProgress(0.05 + m.progress * 0.25, 'Loading the reader…');
    },
  });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK, preserve_interword_spaces: '1' });
    const canvas = await prepare(file);
    const { data } = await worker.recognize(canvas);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
