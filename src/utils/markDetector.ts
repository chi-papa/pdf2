import { CornerDetail, DetectionSettings, MarkType, PageAnalysis } from '../types';

export const DEFAULT_DETECTION_SETTINGS: DetectionSettings = {
  cornerMarginPercent: 18, // 18% from edge for better coverage
  darkThreshold: 140, // slightly higher luminance threshold to capture faint FAX pixels
  minMarkSizePx: 5, // lowered minimum mark size from 12 to 5 to capture smaller ■ marks
  maxMarkSizePx: 180, // maximum size in pixels
  circularityThreshold: 0.70, // circle threshold
  squareExtentThreshold: 0.70, // lowered square extent threshold from 0.80 to 0.70 for imperfect square marks
  minRequiredMarks: 2, // minimum detected marks needed (1-4)
};

/**
 * Analyzes a single image canvas (rendered PDF page) for corner marks.
 */
export function analyzeCanvasPage(
  canvas: HTMLCanvasElement,
  pageNumber: number,
  settings: DetectionSettings = DEFAULT_DETECTION_SETTINGS
): PageAnalysis {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  const width = canvas.width;
  const height = canvas.height;

  // Determine corner crop dimensions
  const cropW = Math.floor(width * (settings.cornerMarginPercent / 100));
  const cropH = Math.floor(height * (settings.cornerMarginPercent / 100));

  const cornerPositions: Array<{
    pos: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    x: number;
    y: number;
  }> = [
    { pos: 'top-left', x: 0, y: 0 },
    { pos: 'top-right', x: width - cropW, y: 0 },
    { pos: 'bottom-left', x: 0, y: height - cropH },
    { pos: 'bottom-right', x: width - cropW, y: height - cropH },
  ];

  const corners: CornerDetail[] = cornerPositions.map((cp) => {
    // Extract corner crop ImageData
    const imgData = ctx.getImageData(cp.x, cp.y, cropW, cropH);
    
    // Create a temporary thumbnail canvas for inspection UI
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = cropW;
    cropCanvas.height = cropH;
    const cropCtx = cropCanvas.getContext('2d');
    if (cropCtx) {
      cropCtx.putImageData(imgData, 0, 0);
    }
    const cropDataUrl = cropCanvas.toDataURL('image/png');

    // Create binary image for visualization
    const binaryImgData = cropCtx ? cropCtx.createImageData(cropW, cropH) : null;

    // Analyze corner for mark
    const markAnalysis = detectMarkInImageData(imgData, settings, binaryImgData);

    let binaryCropDataUrl: string | undefined = undefined;
    if (binaryImgData && cropCtx) {
      const binCanvas = document.createElement('canvas');
      binCanvas.width = cropW;
      binCanvas.height = cropH;
      const binCtx = binCanvas.getContext('2d');
      if (binCtx) {
        binCtx.putImageData(binaryImgData, 0, 0);
        binaryCropDataUrl = binCanvas.toDataURL('image/png');
      }
    }

    return {
      position: cp.pos,
      detectedMark: markAnalysis.markType,
      confidence: markAnalysis.confidence,
      shapeMetric: markAnalysis.metrics,
      cropDataUrl,
      binaryCropDataUrl,
    };
  });

  // Category decision for page based on minRequiredMarks threshold
  const reqMarks = settings.minRequiredMarks || 2;
  const squareCount = corners.filter((c) => c.detectedMark === 'square').length;
  const circleCount = corners.filter((c) => c.detectedMark === 'circle').length;

  let detectedCategory: '注文書' | '在庫確認' | '対象外' = '対象外';
  
  if (squareCount >= reqMarks && squareCount >= circleCount) {
    detectedCategory = '注文書';
  } else if (circleCount >= reqMarks && circleCount > squareCount) {
    detectedCategory = '在庫確認';
  }

  // Create full page snapshot thumbnail
  const pageImageDataUrl = canvas.toDataURL('image/jpeg', 0.85);

  return {
    pageNumber,
    corners,
    detectedCategory,
    pageImageDataUrl,
  };
}

/**
 * Image processing & shape recognition algorithm
 */
function detectMarkInImageData(
  imgData: ImageData,
  settings: DetectionSettings,
  outBinaryImgData?: ImageData | null
): {
  markType: MarkType;
  confidence: number;
  metrics: { circularity: number; aspectRatio: number; extent: number; blackPixelRatio: number };
} {
  const { width, height, data } = imgData;
  const totalPixels = width * height;
  
  // Binarize & find black pixel blobs
  const binaryMap = new Uint8Array(totalPixels);
  let blackPixelCount = 0;

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    // Luminance grayscale formula
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

    if (gray < settings.darkThreshold) {
      binaryMap[i] = 1;
      blackPixelCount++;
      if (outBinaryImgData) {
        // Black pixel in binary visualization
        outBinaryImgData.data[idx] = 15;
        outBinaryImgData.data[idx + 1] = 23;
        outBinaryImgData.data[idx + 2] = 42;
        outBinaryImgData.data[idx + 3] = 255;
      }
    } else {
      binaryMap[i] = 0;
      if (outBinaryImgData) {
        // White pixel in binary visualization
        outBinaryImgData.data[idx] = 248;
        outBinaryImgData.data[idx + 1] = 250;
        outBinaryImgData.data[idx + 2] = 252;
        outBinaryImgData.data[idx + 3] = 255;
      }
    }
  }

  const blackPixelRatio = blackPixelCount / totalPixels;

  // Simple Connected Components Analysis
  const visited = new Uint8Array(totalPixels);
  const blobs: Array<{
    pixelCount: number;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    perimeter: number;
  }> = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (binaryMap[idx] === 1 && visited[idx] === 0) {
        // BFS / Flood Fill to extract blob
        let minX = x, maxX = x, minY = y, maxY = y;
        let pixelCount = 0;
        let perimeter = 0;

        const queue: number[] = [idx];
        visited[idx] = 1;

        while (queue.length > 0) {
          const currentIdx = queue.pop()!;
          const cx = currentIdx % width;
          const cy = Math.floor(currentIdx / width);

          pixelCount++;
          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;

          // Check 4-neighbors for perimeter estimation
          let neighbors = 0;
          const directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1]
          ];

          for (const [dx, dy] of directions) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIdx = ny * width + nx;
              if (binaryMap[nIdx] === 1) {
                neighbors++;
                if (visited[nIdx] === 0) {
                  visited[nIdx] = 1;
                  queue.push(nIdx);
                }
              }
            }
          }

          if (neighbors < 4) {
            perimeter += (4 - neighbors);
          }
        }

        const blobW = maxX - minX + 1;
        const blobH = maxY - minY + 1;

        // Filter candidate blobs by size
        if (blobW >= settings.minMarkSizePx && blobW <= settings.maxMarkSizePx &&
            blobH >= settings.minMarkSizePx && blobH <= settings.maxMarkSizePx) {
          blobs.push({
            pixelCount,
            minX, maxX, minY, maxY,
            perimeter: perimeter || 1
          });
        }
      }
    }
  }

  if (blobs.length === 0) {
    return {
      markType: 'none',
      confidence: 0,
      metrics: { circularity: 0, aspectRatio: 0, extent: 0, blackPixelRatio },
    };
  }

  // Find the best blob candidate (closest to central mark area)
  let bestCandidate: MarkType = 'none';
  let bestConfidence = 0;
  let bestMetrics = { circularity: 0, aspectRatio: 0, extent: 0, blackPixelRatio };

  for (const blob of blobs) {
    const bw = blob.maxX - blob.minX + 1;
    const bh = blob.maxY - blob.minY + 1;
    const bboxArea = bw * bh;
    const area = blob.pixelCount;
    const perimeter = blob.perimeter;

    const aspectRatio = Math.min(bw, bh) / Math.max(bw, bh);
    const extent = area / bboxArea;
    const circularity = (4 * Math.PI * area) / (perimeter * perimeter);

    let type: MarkType = 'none';
    let conf = 0;

    // Square evaluation: high extent (box filled >= squareExtentThreshold), square-like aspect ratio (>= 0.60)
    if (extent >= settings.squareExtentThreshold && aspectRatio >= 0.60 && extent >= 0.72) {
      type = 'square';
      conf = Math.min(99, Math.round(extent * 60 + aspectRatio * 40));
    }
    // Circle evaluation: circularity >= threshold or moderate extent (~0.55-0.82) with aspect ratio >= 0.60
    else if (
      (circularity >= settings.circularityThreshold || (extent >= 0.55 && extent <= 0.82)) &&
      aspectRatio >= 0.60
    ) {
      type = 'circle';
      conf = Math.min(99, Math.round(circularity * 50 + extent * 50));
    }

    if (conf > bestConfidence) {
      bestCandidate = type;
      bestConfidence = conf;
      bestMetrics = {
        circularity: Math.round(circularity * 100) / 100,
        aspectRatio: Math.round(aspectRatio * 100) / 100,
        extent: Math.round(extent * 100) / 100,
        blackPixelRatio: Math.round(blackPixelRatio * 1000) / 1000,
      };
    }
  }

  return {
    markType: bestCandidate,
    confidence: bestConfidence,
    metrics: bestMetrics,
  };
}
