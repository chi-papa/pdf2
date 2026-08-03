import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Eye, Layers, CornerDownRight, ZoomIn, FileText, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { FaxDocument, PageAnalysis } from '../types';
import { processPdfDocument } from '../utils/pdfRenderer';

interface InspectionModalProps {
  doc: FaxDocument | null;
  onClose: () => void;
  onForceCategoryChange?: (docId: string, category: '注文書' | '在庫確認' | '対象外') => void;
}

export const InspectionModal: React.FC<InspectionModalProps> = ({
  doc,
  onClose,
  onForceCategoryChange,
}) => {
  const [currentPageIdx, setCurrentPageIdx] = useState(0);
  const [localPages, setLocalPages] = useState<PageAnalysis[]>([]);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!doc) return;

    setCurrentPageIdx(0);
    setLoadError(null);

    // If doc already has rendered pages, use them
    if (doc.pages && doc.pages.length > 0) {
      setLocalPages(doc.pages);
      setIsLoadingPages(false);
      return;
    }

    // Otherwise render PDF on-the-fly from pdfBuffer so it always displays!
    if (doc.pdfBuffer) {
      setIsLoadingPages(true);
      processPdfDocument(doc.pdfBuffer)
        .then((analyzedPages) => {
          setLocalPages(analyzedPages);
          setIsLoadingPages(false);
        })
        .catch((err) => {
          console.error('Failed to render PDF in InspectionModal:', err);
          setLoadError(err.message || 'PDFの描写解析に失敗しました');
          setIsLoadingPages(false);
        });
    } else {
      setLocalPages([]);
      setIsLoadingPages(false);
    }
  }, [doc]);

  if (!doc) return null;

  const pages = localPages.length > 0 ? localPages : (doc.pages || []);
  const currentPage = pages[currentPageIdx] || pages[0];

  const getCornerTitle = (pos: string) => {
    switch (pos) {
      case 'top-left': return '左上 (Top-Left)';
      case 'top-right': return '右上 (Top-Right)';
      case 'bottom-left': return '左下 (Bottom-Left)';
      case 'bottom-right': return '右下 (Bottom-Right)';
      default: return pos;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-100">{doc.fileName}</h3>
                <span
                  className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
                    doc.category === '注文書'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : doc.category === '在庫確認'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-700 text-slate-300 border border-slate-600'
                  }`}
                >
                  判定結果: {doc.category || '未判定'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                サイズ: {(doc.fileSize / 1024).toFixed(1)} KB | 総ページ数: {pages.length} ページ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50">
          {/* Page Switcher for Multi-page PDFs */}
          {pages.length > 1 && (
            <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>複数ページPDFのページ切替 (全 {pages.length} ページ)</span>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  disabled={currentPageIdx === 0}
                  onClick={() => setCurrentPageIdx((p) => Math.max(0, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-300 text-slate-700 disabled:opacity-30 hover:bg-slate-100"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-800 font-mono">
                  Page {currentPageIdx + 1} / {pages.length}
                </span>
                <button
                  disabled={currentPageIdx === pages.length - 1}
                  onClick={() => setCurrentPageIdx((p) => Math.min(pages.length - 1, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-300 text-slate-700 disabled:opacity-30 hover:bg-slate-100"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {currentPage ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Rendered Page Preview with Corner Markers */}
              <div className="lg:col-span-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center relative">
                <div className="text-xs font-bold text-slate-600 mb-2 flex items-center justify-between w-full">
                  <span>Page {currentPage.pageNumber} 全体プレビュー</span>
                  <span className="text-indigo-600 font-semibold">
                    ページ判定: {currentPage.detectedCategory}
                  </span>
                </div>

                <div className="relative border border-slate-300 rounded-lg overflow-hidden bg-slate-100 max-h-[500px]">
                  {currentPage.pageImageDataUrl ? (
                    <img
                      src={currentPage.pageImageDataUrl}
                      alt={`Page ${currentPage.pageNumber}`}
                      className="max-h-[480px] object-contain shadow-md"
                    />
                  ) : (
                    <div className="w-64 h-80 bg-slate-200 flex items-center justify-center text-slate-400">
                      画像読み込み中...
                    </div>
                  )}

                  {/* Corner Highlight Overlays */}
                  <div className="absolute top-2 left-2 p-1 bg-indigo-600/80 text-white rounded text-[10px] font-bold">
                    左上 TL
                  </div>
                  <div className="absolute top-2 right-2 p-1 bg-indigo-600/80 text-white rounded text-[10px] font-bold">
                    右上 TR
                  </div>
                  <div className="absolute bottom-2 left-2 p-1 bg-indigo-600/80 text-white rounded text-[10px] font-bold">
                    左下 BL
                  </div>
                  <div className="absolute bottom-2 right-2 p-1 bg-indigo-600/80 text-white rounded text-[10px] font-bold">
                    右下 BR
                  </div>
                </div>
              </div>

              {/* Right Column: 4-Corner Crop Zoom & Metrics Breakdown */}
              <div className="lg:col-span-6 space-y-4">
                <div className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                  <ZoomIn className="w-4 h-4 text-indigo-600" />
                  <span>四隅マーク拡大・画像解析詳細 (4-Corner Inspection)</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {currentPage.corners.map((corner, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border transition-all ${
                        corner.detectedMark === 'circle'
                          ? 'bg-blue-50/50 border-blue-200'
                          : corner.detectedMark === 'square'
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-slate-700">
                          {getCornerTitle(corner.position)}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            corner.detectedMark === 'circle'
                              ? 'bg-blue-600 text-white'
                              : corner.detectedMark === 'square'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {corner.detectedMark === 'circle'
                            ? '● 黒丸検出'
                            : corner.detectedMark === 'square'
                            ? '■ 黒四角検出'
                            : 'マークなし'}
                        </span>
                      </div>

                      {/* Crop Image Thumbnail */}
                      <div className="flex items-center space-x-3">
                        <div className="w-16 h-16 bg-slate-900 rounded-lg overflow-hidden border border-slate-300 shrink-0 flex items-center justify-center">
                          {corner.cropDataUrl ? (
                            <img
                              src={corner.cropDataUrl}
                              alt={corner.position}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[10px] text-slate-400">Crop</span>
                          )}
                        </div>

                        {/* Metrics Details */}
                        <div className="text-[10px] text-slate-600 space-y-0.5 font-mono">
                          <div>確信度: <span className="font-bold text-slate-800">{corner.confidence}%</span></div>
                          <div>円形度: {corner.shapeMetric?.circularity ?? 0}</div>
                          <div>矩形充填度: {corner.shapeMetric?.extent ?? 0}</div>
                          <div>縦横比: {corner.shapeMetric?.aspectRatio ?? 0}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Manual Force Category Override option */}
                {onForceCategoryChange && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm mt-4 text-xs">
                    <span className="font-bold text-slate-700 block mb-2">
                      手動カテゴリ変更 (Override Classification):
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          onForceCategoryChange(doc.id, '注文書');
                          onClose();
                        }}
                        className="flex-1 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-semibold hover:bg-blue-100 text-center"
                      >
                        注文書 (■) に指定
                      </button>
                      <button
                        onClick={() => {
                          onForceCategoryChange(doc.id, '在庫確認');
                          onClose();
                        }}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold hover:bg-emerald-100 text-center"
                      >
                        在庫確認 (●) に指定
                      </button>
                      <button
                        onClick={() => {
                          onForceCategoryChange(doc.id, '対象外');
                          onClose();
                        }}
                        className="flex-1 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-300 font-semibold hover:bg-slate-200 text-center"
                      >
                        対象外に指定
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : isLoadingPages ? (
            <div className="p-12 text-center text-slate-600 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
              <p className="text-sm font-bold text-slate-800">PDFイメージと四隅マークをリアルタイム解析描画中...</p>
              <p className="text-xs text-slate-500">少々お待ちください</p>
            </div>
          ) : loadError ? (
            <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center text-rose-700 space-y-2">
              <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
              <p className="font-bold text-sm">PDFのプレビュー描画に失敗しました</p>
              <p className="text-xs font-mono text-rose-600">{loadError}</p>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500">ページデータの解析情報がありません。</div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg text-xs transition-all"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
