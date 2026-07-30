import * as pdfjsLib from 'pdfjs-dist';
import { analyzeCanvasPage } from './markDetector';
import { DetectionSettings, PageAnalysis } from '../types';

// Set global worker source using jsdelivr npm CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || '6.2.108'}/build/pdf.worker.min.mjs`;

/**
 * Renders each page of a PDF buffer onto an HTML Canvas and performs corner mark detection.
 */
export async function processPdfDocument(
  pdfBuffer: ArrayBuffer,
  settings?: DetectionSettings
): Promise<PageAnalysis[]> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: pdfBuffer,
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
