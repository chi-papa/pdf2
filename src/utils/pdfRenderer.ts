import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { analyzeCanvasPage } from './markDetector';
import { DetectionSettings, PageAnalysis } from '../types';

// Set worker source to Vite bundled asset URL
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Renders each page of a PDF buffer onto an HTML Canvas and performs corner mark detection.
 */
export async function processPdfDocument(
  pdfInput: ArrayBuffer | Uint8Array,
  settings?: DetectionSettings
): Promise<PageAnalysis[]> {
  try {
    if (!pdfInput) {
      throw new Error('PDFデータが存在しません');
    }

    let inputBytes: Uint8Array;
    if (pdfInput instanceof Uint8Array) {
      if (!pdfInput.buffer || pdfInput.buffer.byteLength === 0) {
        throw new Error('PDFバッファが破棄されているため再読み込みできません');
      }
      inputBytes = pdfInput;
    } else if (pdfInput instanceof ArrayBuffer) {
      if (pdfInput.byteLength === 0) {
        throw new Error('PDFバッファが破棄されているため再読み込みできません');
      }
      inputBytes = new Uint8Array(pdfInput);
    } else {
      inputBytes = new Uint8Array(pdfInput);
    }

    // Allocate a brand new Uint8Array so PDF.js worker transfer ONLY detaches this temporary copy
    const safeData = new Uint8Array(inputBytes.byteLength);
    safeData.set(inputBytes);

    const loadingTask = pdfjsLib.getDocument({
      data: safeData,
      cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || '6.2.108'}/cmaps/`,
      cMapPacked: true,
    });

    const pdfDoc = await loadingTask.promise;
    const pageCount = pdfDoc.numPages;
    const results: PageAnalysis[] = [];

    for (let i = 1; i <= pageCount; i++) {
      const page = await pdfDoc.getPage(i);
      
      // Render page to canvas at 1.5x resolution for accurate shape detection
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to create canvas context');
      }

      await page.render({
        canvasContext: ctx,
        canvas: canvas,
        viewport,
      }).promise;

      // Analyze canvas corner marks
      const pageAnalysis = analyzeCanvasPage(canvas, i, settings);
      results.push(pageAnalysis);
    }

    return results;
  } catch (err: any) {
    console.error('PDF rendering error:', err);
    throw new Error(`PDF解読エラー: ${err.message || 'PDFの解析に失敗しました'}`);
  }
}
