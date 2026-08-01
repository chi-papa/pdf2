import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Download,
  Info,
  Square,
  Circle,
  Code2,
  Copy,
  Check,
  Maximize2,
  Sparkles,
  ShieldCheck,
  HelpCircle
} from 'lucide-react';
import { createSampleFaxPdf } from '../utils/pdfGenerator';

interface FaxFormatGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSampleToQueue?: (fileName: string, pdfBuffer: Uint8Array) => void;
}

export const FaxFormatGuideModal: React.FC<FaxFormatGuideModalProps> = ({
  isOpen,
  onClose,
  onAddSampleToQueue,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const sampleCssCode = `/* FAX用 注文書・在庫確認フォーマット推奨CSS */
.corner-mark-square {
  width: 10mm;          /* 推奨サイズ: 8mm〜12mm */
  height: 10mm;
  background-color: #000000; /* K100% 完全黒ベタ */
  position: absolute;
  /* 紙端から10mm〜15mm内側に配置 */
  top: 12mm;
  left: 12mm;
  margin: 0;
  padding: 0;
}

.corner-mark-circle {
  width: 10mm;
  height: 10mm;
  background-color: #000000;
  border-radius: 50%;   /* 完全な真円 */
  position: absolute;
  top: 12mm;
  right: 12mm;
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(sampleCssCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadSample = async (type: '注文書' | '在庫確認') => {
    setIsGenerating(true);
    try {
      const pdfBytes = await createSampleFaxPdf({
        type,
        title: type === '注文書' ? 'PURCHASE ORDER (注文書 推奨フォーマット)' : 'INVENTORY CHECK (在庫確認 推奨フォーマット)',
        pageCount: 1,
        docNumber: `REC-${type === '注文書' ? 'PO' : 'INV'}-2026`,
        supplierName: '推奨規格サンプル株式会社',
      });

      const fileName = `推奨規格FAX_${type}_サンプル.pdf`;

      if (onAddSampleToQueue) {
        onAddSampleToQueue(fileName, pdfBytes);
      }

      // Also trigger browser download
      const blob = new Blob([pdfBytes.buffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
              <ShieldCheck className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <span>FAXフォーマット & 四隅マーク推奨設計ガイド</span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                認識率99.9%を達成するための印字サイズ・配置・解像度最適化マニュアル
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-slate-800 text-xs">
          {/* Key Recommendations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Mark Size Recommendation */}
            <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-200/80 space-y-2">
              <div className="flex items-center space-x-2 text-blue-900">
                <Maximize2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-bold text-sm">1. 記号サイズ: 8mm 〜 12mm を推奨</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                FAX送信（標準100〜200dpi）で印字がかすれたり擦れたりしても確実に認識できるよう、<strong className="text-blue-900">10mm（約28〜35pt / 60〜100px）</strong>程度の大きめな記号配置を推奨します。5mm未満の小さいマークは擦れで途切れるため避けてください。
              </p>
            </div>

            {/* 2. Position & Margin Recommendation */}
            <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-200/80 space-y-2">
              <div className="flex items-center space-x-2 text-indigo-900">
                <FileCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="font-bold text-sm">2. 配置: 用紙端から 10mm 内側</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                FAX機器の給紙ローラー送りズレや用紙端欠けを防ぐため、<strong className="text-indigo-900">用紙の端から 10mm 〜 15mm ほど内側の余白エリア</strong>に配置してください。用紙の極端な端ギリギリは給紙時に切れるリスクがあります。
              </p>
            </div>

            {/* 3. Solid Fill & Contrast */}
            <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold text-sm">3. 濃度: K100% 完全塗りつぶし</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                輪郭だけの白抜き記号（□や○）ではなく、<strong className="text-emerald-900">K100%漆黒のベタ塗り「■」「●」</strong>にしてください。FAX圧縮時のノイズで中空記号はつぶれやすいため、塗りつぶし記号が最も安定します。
              </p>
            </div>

            {/* 4. Quiet Zone / Clear Area */}
            <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200/80 space-y-2">
              <div className="flex items-center space-x-2 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-bold text-sm">4. 余白: 周囲 5mm に文字・線を置かない</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                マークの周囲5mm以内は<strong className="text-amber-900">文字や表の罫線を接触させない</strong>でください。表枠とマークが連結すると「1つの大きな図形」と誤認識される原因になります。
              </p>
            </div>
          </div>

          {/* Visual Comparison Section (Good vs Bad Examples) */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>フォーマット仕様の比較 (推奨 vs 避けるべき例)</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* GOOD EXAMPLE */}
              <div className="p-4 rounded-2xl bg-emerald-50/50 border-2 border-emerald-300/80 space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                  <span className="font-bold text-emerald-800 text-xs flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>推奨フォーマット (高精度)</span>
                  </span>
                  <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded">
                    認識率 99.9%
                  </span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-black rounded-xs flex items-center justify-center shrink-0 shadow-xs">
                      <Square className="w-6 h-6 text-black fill-black" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-800 text-xs">■ 10mm 黒ベタ正方形 (注文書)</p>
                      <p className="text-[11px] text-slate-500">
                        ● 周囲5mmに十分な白地余白がある
                        <br />● 用紙端から12mm内側に配置
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 pt-2 border-t border-slate-100">
                    <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center shrink-0 shadow-xs">
                      <Circle className="w-6 h-6 text-black fill-black" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-800 text-xs">● 10mm 黒ベタ真円 (在庫確認)</p>
                      <p className="text-[11px] text-slate-500">
                        ● 四隅すべてに同一記号が配置されている
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* BAD EXAMPLE */}
              <div className="p-4 rounded-2xl bg-rose-50/50 border-2 border-rose-200 space-y-3">
                <div className="flex items-center justify-between border-b border-rose-200 pb-2">
                  <span className="font-bold text-rose-800 text-xs flex items-center space-x-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>非推奨フォーマット (不具合の原因)</span>
                  </span>
                  <span className="text-[10px] bg-rose-600 text-white font-bold px-2 py-0.5 rounded">
                    誤認識リスクあり
                  </span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 text-[11px] text-slate-600">
                  <div className="flex items-start space-x-2">
                    <span className="text-rose-600 font-bold">❌</span>
                    <p><strong>3mm以下の小さい記号:</strong> FAX擦れでマークの一部が消えて認識不可になる</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-rose-600 font-bold">❌</span>
                    <p><strong>白抜き記号 (□ や ○):</strong> FAX線圧縮で中央がつぶれて線として認識される</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-rose-600 font-bold">❌</span>
                    <p><strong>表の罫線や文字と接触:</strong> 表の角と記号がくっつき大きな図形になる</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-rose-600 font-bold">❌</span>
                    <p><strong>用紙ギリギリ（1mm端）:</strong> 送信機の給紙ズレでマークが画面外へ見切れる</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Template Download & CSS Code snippet */}
          <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-white flex items-center space-x-2">
                <Code2 className="w-4 h-4 text-cyan-400" />
                <span>推奨フォーマットCSS（HTML帳票・Excel帳票作成用）</span>
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-bold flex items-center space-x-1 border border-slate-700 transition-all cursor-pointer"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'コピーしました' : 'CSSをコピー'}</span>
              </button>
            </div>

            <pre className="p-3 bg-slate-950 rounded-xl text-[11px] font-mono text-cyan-300 overflow-x-auto border border-slate-800 leading-relaxed">
              {sampleCssCode}
            </pre>

            <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400">
                即座に動作確認できる推奨フォーマットPDFサンプルを生成・ダウンロードできます
              </span>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownloadSample('注文書')}
                  disabled={isGenerating}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>推奨 注文書(■) PDFダウンロード</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadSample('在庫確認')}
                  disabled={isGenerating}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>推奨 在庫確認(●) PDFダウンロード</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-slate-500 text-[11px]">
            ※ 送信先FAX機器やスキャナ性能に合わせて、設定パネルのスライダーで二値化閾値を調整できます。
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer transition-all shadow-xs"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
