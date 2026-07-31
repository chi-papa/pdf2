export type MarkType = 'circle' | 'square' | 'none';

export interface CornerDetail {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  detectedMark: MarkType;
  confidence: number; // 0 to 100%
  shapeMetric: {
    circularity: number;
    aspectRatio: number;
    extent: number; // filling ratio
    blackPixelRatio: number;
  };
  cropDataUrl?: string;
}

export interface PageAnalysis {
  pageNumber: number;
  corners: CornerDetail[];
  detectedCategory: '注文書' | '在庫確認' | '対象外';
  pageImageDataUrl?: string;
}

export type DocumentStatus = 'pending' | 'processing' | 'sorted' | 'ignored' | 'error';
export type DocumentCategory = '注文書' | '在庫確認' | '対象外';

export interface FaxDocument {
  id: string;
  fileName: string;
  fileSize: number; // in bytes
  uploadedAt: string;
  status: DocumentStatus;
  category?: DocumentCategory;
  destinationPath?: string;
  pages: PageAnalysis[];
  matchedPageNum?: number;
  pdfDataUrl?: string; // base64 or object URL
  pdfBuffer?: Uint8Array;
  errorMessage?: string;
  processedAt?: string;
}

export interface FolderConfig {
  purchaseOrderFolder: string;
  inventoryFolder: string;
  unclassifiedFolder: string;
  autoDeleteOriginal?: boolean;
}

export interface DetectionSettings {
  cornerMarginPercent: number; // percentage of width/height for corner crop (e.g., 15%)
  darkThreshold: number; // 0-255 threshold for black mark
  minMarkSizePx: number; // min pixel size for shape
  maxMarkSizePx: number;
  circularityThreshold: number; // >0.8 for circle ●
  squareExtentThreshold: number; // >0.8 for square ■
}

export interface ProcessingLog {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  fileName: string;
  message: string;
  category?: DocumentCategory;
  details?: string;
}
