import React, { useState } from 'react';
import { X, Sparkles, FileText, CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react';
import { createSampleFaxPdf } from '../utils/pdfGenerator';

interface SampleGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSampleToQueue: (fileName: string, pdfBuffer: Uint8Array) => void;
  onOpenFaxFormatGuide?: () => void;
}

export const SampleGeneratorModal: React.FC<SampleGeneratorModalProps> = ({
  isOpen,
  onClose,
  onAddSampleToQueue,
  onOpenFaxFormatGuide,
}) => {
  const [docType, setDocType] = useState<'注文書' | '在庫確認' | '対象外'>('注文書');
  const [pageCount, setPageCount] = useState<number>(1);
  const [supplierName, setSupplierName] = useState('Global Materials Co., Ltd.');
  const [docNumber, setDocNumber] = useState('FAX-2026-8801');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleCreateCustom = async () => {
    setIsGenerating(true);
    try {
      const titleText =
        docType === '注文書'
          ? 'PURCHASE ORDER (注文書)'
          : docType === '在庫確認'
          ? 'INVENTORY INQUIRY (在庫確認書)'
          : 'QUOTATION REQUEST (見積依頼書)';

      const pdfBuffer = await createSampleFaxPdf({
        title: titleText,
        type: docType,
        pageCount,
        supplierName,
        docNumber,
      });

      const fileName = `${docType}_${docNumber}_${pageCount}P.pdf`;
      onAddSampleToQueue(fileName, pdfBuffer);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateBatchSuite = async () => {
    setIsGenerating(true);
    try {
      // Sample 1: 2-page Purchase Order (注文書) with ● marks
      const pdf1 = await createSampleFaxPdf({
        title: 'PURCHASE ORDER (注文書)',
        type: '注文書',
        pageCount: 2,
        supplierName: '日本産業機械株式会社',
        docNumber: 'PO-2026-0701',
      });
      onAddSampleToQueue('注文書_日本産業機械_2P.pdf', pdf1);

      // Sample 2: 1-page Inventory Check (在庫確認) with ■ marks
      const pdf2 = await createSampleFaxPdf({
        title: 'INVENTORY CHECK (在庫照会依頼)',
        type: '在庫確認',
        pageCount: 1,
        supplierName: '東海ロジスティクス商事',
        docNumber: 'INV-2026-0412',
      });
      onAddSampleToQueue('在庫確認_東海ロジ商事_1P.pdf', pdf2);

      // Sample 3: Unmatched document (見積書・対象外) with NO marks
      const pdf3 = await createSampleFaxPdf({
        title: 'ESTIMATE & QUOTATION (一般見積書)',
        type: '対象外',
        pageCount: 1,
        supplierName: '関東金属加工ファクトリー',
        docNumber: 'EST-2026-9901',
      });
      onAddSampleToQueue('見積書_関東金属_対象外.pdf', pdf3);

      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm">テスト用FAX PDFサンプル生成</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5 text-xs text-slate-700">
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-900 flex items-center justify-between">
            <div>
              <span className="font-bold block">ワンクリック標準テストセット生成</span>
              <span className="text-[11px] text-indigo-700">
                「注文書(■)」「在庫確認(●)」「対象外(なし)」の3種類をまとめて生成
              </span>
            </div>
            <button
              onClick={handleGenerateBatchSuite}
              disabled={isGenerating}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shrink-0 shadow-sm"
            >
              {isGenerating ? '生成中...' : '3種一括生成'}
            </button>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4 text-slate-400 text-[11px]">または カスタムサンプル生成</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Document Type Selector */}
          <div>
            <label className="block font-bold text-slate-800 mb-2">FAX書類タイプ (四隅マーク)</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDocType('注文書')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                  docType === '注文書'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                ■ 注文書
              </button>

              <button
                type="button"
                onClick={() => setDocType('在庫確認')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                  docType === '在庫確認'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                ● 在庫確認
              </button>

              <button
                type="button"
                onClick={() => setDocType('対象外')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                  docType === '対象外'
                    ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                マークなし (対象外)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">ページ数</label>
              <select
                value={pageCount}
                onChange={(e) => setPageCount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
              >
                <option value={1}>1 ページ</option>
                <option value={2}>2 ページ (複数ページ検証)</option>
                <option value={3}>3 ページ</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">伝票番号</label>
              <input
                type="text"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">宛先 / 送信元取引先名</label>
            <input
              type="text"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          {onOpenFaxFormatGuide ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenFaxFormatGuide();
              }}
              className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center space-x-1"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>FAX印字推奨規格ガイドを見る</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg text-xs"
            >
              キャンセル
            </button>

            <button
              onClick={handleCreateCustom}
              disabled={isGenerating}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-lg text-xs transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              {isGenerating && <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />}
              <span>PDF生成して追加</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
