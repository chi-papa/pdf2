import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface SamplePdfOptions {
  title: string;
  type: '注文書' | '在庫確認' | '対象外';
  pageCount?: number;
  docNumber?: string;
  supplierName?: string;
  itemDetails?: Array<{ code: string; name: string; qty: number; price: number }>;
}

function sanitizeWinAnsiText(text: string): string {
  if (!text) return '';
  let cleaned = text
    .replace(/注文書/g, 'PURCHASE ORDER')
    .replace(/在庫確認書/g, 'INVENTORY INQUIRY')
    .replace(/在庫確認/g, 'INVENTORY INQUIRY')
    .replace(/在庫照会依頼/g, 'INVENTORY INQUIRY')
    .replace(/在庫照会/g, 'INVENTORY INQUIRY')
    .replace(/見積依頼書/g, 'QUOTATION REQUEST')
    .replace(/見積書/g, 'QUOTATION / ESTIMATE')
    .replace(/対象外/g, 'OTHER DOCUMENT')
    .replace(/日本産業機械株式会社/g, 'Japan Industrial Machinery Co., Ltd.')
    .replace(/東海ロジスティクス商事/g, 'Tokai Logistics Corp.')
    .replace(/東海ロジスティクス/g, 'Tokai Logistics Corp.')
    .replace(/関東金属加工ファクトリー/g, 'Kanto Metal Works')
    .replace(/関東金属ファクトリー/g, 'Kanto Metal Works');

  // Strip non-WinAnsi / non-ASCII characters
  const result = cleaned.replace(/[^\x00-\xFF]/g, '').trim();
  return result || 'DOCUMENT';
}

export async function createSampleFaxPdf(options: SamplePdfOptions): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const pagesToCreate = options.pageCount || 1;

  for (let p = 1; p <= pagesToCreate; p++) {
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 Size standard in pt
    const { width, height } = page.getSize();

    // Draw document border / frame (inset to avoid touching corner marks)
    page.drawRectangle({
      x: 55,
      y: 55,
      width: width - 110,
      height: height - 110,
      borderWidth: 1,
      borderColor: rgb(0.2, 0.2, 0.2),
    });

    // Draw Title Header
    const safeTitle = sanitizeWinAnsiText(options.title);
    page.drawText(safeTitle, {
      x: 50,
      y: height - 80,
      size: 20,
      font,
      color: rgb(0.1, 0.1, 0.3),
    });

    // Subtitle
    page.drawText(`FAX TRANSMISSION - PAGE ${p} OF ${pagesToCreate}`, {
      x: 50,
      y: height - 105,
      size: 10,
      font: regularFont,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Document info box
    page.drawRectangle({
      x: 50,
      y: height - 190,
      width: 280,
      height: 70,
      color: rgb(0.96, 0.96, 0.98),
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1,
    });

    const safeDocNum = sanitizeWinAnsiText(options.docNumber || 'FAX-2026-001');
    const safeSupplier = sanitizeWinAnsiText(options.supplierName || 'Global Suppliers Corp');

    page.drawText(`DOC NO: ${safeDocNum}`, {
      x: 60,
      y: height - 140,
      size: 10,
      font: regularFont,
    });
    page.drawText(`TO: ${safeSupplier}`, {
      x: 60,
      y: height - 160,
      size: 10,
      font: regularFont,
    });
    page.drawText(`DATE: 2026-07-30`, {
      x: 60,
      y: height - 180,
      size: 10,
      font: regularFont,
    });

    // Draw sample items table
    const tableTop = height - 230;
    page.drawRectangle({
      x: 50,
      y: tableTop - 200,
      width: width - 100,
      height: 200,
      borderColor: rgb(0.7, 0.7, 0.7),
      borderWidth: 1,
    });

    // Table Header
    page.drawRectangle({
      x: 50,
      y: tableTop - 25,
      width: width - 100,
      height: 25,
      color: rgb(0.9, 0.92, 0.96),
    });
    page.drawText('ITEM CODE / NAME', { x: 60, y: tableTop - 18, size: 10, font });
    page.drawText('QTY', { x: 350, y: tableTop - 18, size: 10, font });
    page.drawText('PRICE', { x: 450, y: tableTop - 18, size: 10, font });

    const items = options.itemDetails || [
      { code: 'ITEM-A101', name: 'Industrial Motor Unit 200W', qty: 5, price: 12800 },
      { code: 'ITEM-B205', name: 'Precision Bearing Sets', qty: 20, price: 3400 },
      { code: 'ITEM-C902', name: 'Hydraulic Control Valve', qty: 2, price: 45000 },
    ];

    items.forEach((item, idx) => {
      const yPos = tableTop - 50 - idx * 30;
      const safeCode = sanitizeWinAnsiText(item.code);
      const safeName = sanitizeWinAnsiText(item.name);
      page.drawText(`${safeCode} - ${safeName}`, { x: 60, y: yPos, size: 10, font: regularFont });
      page.drawText(`${item.qty}`, { x: 350, y: yPos, size: 10, font: regularFont });
      page.drawText(`JPY ${item.price.toLocaleString()}`, { x: 450, y: yPos, size: 10, font: regularFont });
    });

    // Notes
    page.drawText('NOTE: Please return confirmation receipt by FAX immediately upon arrival.', {
      x: 50,
      y: 100,
      size: 9,
      font: regularFont,
      color: rgb(0.5, 0.5, 0.5),
    });

    // NOW DRAW CORNER MARKS: 注文書 = ■ (Square), 在庫確認 = ● (Circle)
    // Corner Mark Position margins: 40pt from corner edges
    const margin = 40;
    const markRadius = 10; // 20pt diameter mark
    const markSquareSize = 20;

    if (options.type === '注文書') {
      // 注文書 = 黒四角 "■" in 4 corners
      const corners = [
        { x: margin - markSquareSize / 2, y: height - margin - markSquareSize / 2 }, // Top-Left
        { x: width - margin - markSquareSize / 2, y: height - margin - markSquareSize / 2 }, // Top-Right
        { x: margin - markSquareSize / 2, y: margin - markSquareSize / 2 }, // Bottom-Left
        { x: width - margin - markSquareSize / 2, y: margin - markSquareSize / 2 }, // Bottom-Right
      ];

      corners.forEach((c) => {
        page.drawRectangle({
          x: c.x,
          y: c.y,
          width: markSquareSize,
          height: markSquareSize,
          color: rgb(0, 0, 0),
        });
      });
    } else if (options.type === '在庫確認') {
      // 在庫確認 = 黒丸 "●" in 4 corners
      const corners = [
        { x: margin, y: height - margin }, // Top-Left
        { x: width - margin, y: height - margin }, // Top-Right
        { x: margin, y: margin }, // Bottom-Left
        { x: width - margin, y: margin }, // Bottom-Right
      ];

      corners.forEach((c) => {
        page.drawCircle({
          x: c.x,
          y: c.y,
          size: markRadius,
          color: rgb(0, 0, 0),
        });
      });
    }
    // If '対象外', no marks drawn!
  }

  return await pdfDoc.save();
}

