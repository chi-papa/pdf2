import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Folder,
  Settings2,
  Sliders,
  RotateCcw,
  Square,
  Circle,
  Upload,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Image as ImageIcon,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { DetectionSettings, FolderConfig, PageAnalysis } from '../types';
import { DEFAULT_DETECTION_SETTINGS, analyzeCanvasPage } from '../utils/markDetector';
import { createSampleFaxPdf } from '../utils/pdfGenerator';
import { processPdfDocument } from '../utils/pdfRenderer';

interface FolderConfigPanelProps {
  folderConfig: FolderConfig;
  onUpdateFolderConfig: (config: FolderConfig) => void;
  detectionSettings: DetectionSettings;
  onUpdateDetectionSettings: (settings: DetectionSettings) => void;
}

export const FolderConfigPanel: React.FC<FolderConfigPanelProps> = ({
  folderConfig,
  onUpdateFolderConfig,
  detectionSettings,
  onUpdateDetectionSettings,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'folders' | 'detection'>('folders');

  // Interactive Test & Detection Tuning State
  const [testSource, setTestSource] = useState<'po' | 'stock' | 'custom'>('po');
  const [customImageSrc, setCustomImageSrc] = useState<string | null>(null);
  const [realtimeAnalysis, setRealtimeAnalysis] = useState<PageAnalysis | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Save Toast Feedback
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Reset parameters
  const handleResetSettings = () => {
    onUpdateDetectionSettings(DEFAULT_DETECTION_SETTINGS);
  };

  const handleSaveSettings = () => {
    try {
      localStorage.setItem('fax_ocr_folder_config', JSON.stringify(folderConfig));
      localStorage.setItem('fax_ocr_detection_settings', JSON.stringify(detectionSettings));
      setSaveSuccessMessage('設定をブラウザに保存しました');
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  };

  // Run real-time detection on current test source
  const runDetection = useCallback(async () => {
    setIsProcessing(true);
    try {
      let canvas: HTMLCanvasElement | null = null;

      if (testSource === 'po' || testSource === 'stock') {
        const type = testSource === 'po' ? '注文書' : '在庫確認';
        const pdfBytes = await createSampleFaxPdf({
          type,
          title: type === '注文書' ? 'サンプルFAX 注文書 (■)' : 'サンプルFAX 在庫確認 (●)',
        });

        const analyses = await processPdfDocument(pdfBytes.buffer, detectionSettings);
        if (analyses.length > 0) {
          setRealtimeAnalysis(analyses[0]);
        }
        setIsProcessing(false);
        return;
      } else if (testSource === 'custom' && customImageSrc) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = customImageSrc;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const analysis = analyzeCanvasPage(canvas, 1, detectionSettings);
          setRealtimeAnalysis(analysis);
        }
      }
    } catch (err) {
      console.error('Realtime detection error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [testSource, customImageSrc, detectionSettings]);

  // Run detection when testSource or custom image or detectionSettings change
  useEffect(() => {
    if (isOpen && activeTab === 'detection') {
      runDetection();
    }
  }, [isOpen, activeTab, testSource, customImageSrc, detectionSettings, runDetection]);

  // Draw Overlay on Preview Canvas when analysis is updated
  useEffect(() => {
    if (!previewCanvasRef.current || !realtimeAnalysis) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = realtimeAnalysis.pageImageDataUrl;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Draw corner search regions and detection badges
      const margin = detectionSettings.cornerMarginPercent / 100;
      const cropW = Math.floor(canvas.width * margin);
      const cropH = Math.floor(canvas.height * margin);

      const cornerCoords = {
        'top-left': { x: 0, y: 0, label: '左上' },
        'top-right': { x: canvas.width - cropW, y: 0, label: '右上' },
        'bottom-left': { x: 0, y: canvas.height - cropH, label: '左下' },
        'bottom-right': { x: canvas.width - cropW, y: canvas.height - cropH, label: '右下' },
      };

      realtimeAnalysis.corners.forEach((corner) => {
        const coord = cornerCoords[corner.position];
        if (!coord) return;

        // Draw search area bounding box
        ctx.strokeStyle = corner.detectedMark !== 'none' ? '#10b981' : '#f43f5e';
        ctx.lineWidth = Math.max(2, Math.round(canvas.width / 300));
        ctx.fillStyle = corner.detectedMark !== 'none' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.08)';
        ctx.fillRect(coord.x, coord.y, cropW, cropH);
        ctx.strokeRect(coord.x, coord.y, cropW, cropH);

        // Draw Mark Tag Badge
        const tagText =
          corner.detectedMark === 'square'
            ? '■ 注文書'
            : corner.detectedMark === 'circle'
            ? '● 在庫'
            : '未検出';

        const badgeBg =
          corner.detectedMark === 'square'
            ? '#2563eb'
            : corner.detectedMark === 'circle'
            ? '#059669'
            : '#e11d48';

        ctx.font = 'bold ' + Math.max(12, Math.round(canvas.width / 45)) + 'px sans-serif';
        const textMetrics = ctx.measureText(tagText);
        const padding = 6;
        const badgeW = textMetrics.width + padding * 2;
        const badgeH = Math.max(22, Math.round(canvas.width / 35));

        // Position badge inside crop corner
        let bx = coord.x + 8;
        let by = coord.y + 8;
        if (corner.position === 'top-right' || corner.position === 'bottom-right') {
          bx = coord.x + cropW - badgeW - 8;
        }
        if (corner.position === 'bottom-left' || corner.position === 'bottom-right') {
          by = coord.y + cropH - badgeH - 8;
        }

        ctx.fillStyle = badgeBg;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(bx, by, badgeW, badgeH, 4) : ctx.rect(bx, by, badgeW, badgeH);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.fillText(tagText, bx + padding, by + badgeH - 6);
      });
    };
  }, [realtimeAnalysis, detectionSettings]);

  // Handle Upload Custom FAX Image
  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      setCustomImageSrc(evt.target?.result as string);
      setTestSource('custom');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={`bg-white rounded-2xl border transition-all duration-200 mb-6 shadow-sm overflow-hidden ${
      isOpen ? 'border-blue-500/80 ring-2 ring-blue-500/10' : 'border-slate-200 hover:border-blue-400'
    }`}>
      {/* Panel Header Toggle - Clear Accordion UI */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-5 py-4 flex items-center justify-between text-left transition-all cursor-pointer ${
          isOpen ? 'bg-blue-50/60 border-b border-blue-100' : 'bg-slate-50 hover:bg-blue-50/30'
        }`}
        aria-expanded={isOpen}
      >
        <div className="flex items-center space-x-3.5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            isOpen ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-slate-800 text-slate-100'
          }`}>
            <Sliders className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                折りたたみ設定パネル
              </span>
              <h2 className="font-bold text-slate-900 text-sm sm:text-base">
                環境設定 & マーク検出スライダー調整
              </h2>
            </div>
            <p className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-x-2">
              <span>保存先フォルダパス・二値化閾値スライダー・Python監視コード生成</span>
              {!isOpen && (
                <span className="inline-flex items-center space-x-1 text-[11px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  <span>(注文書: {folderConfig.purchaseOrderFolder || '未設定'})</span>
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Clear Toggle Action Button */}
        <div className="flex items-center space-x-3 shrink-0 ml-2">
          <div className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all shadow-xs ${
            isOpen
              ? 'bg-blue-600 text-white shadow-blue-600/20'
              : 'bg-white text-slate-700 border border-slate-300 hover:border-blue-500 hover:text-blue-700'
          }`}>
            <span>{isOpen ? '設定パネルを閉じる' : '設定パネルを開く'}</span>
            {isOpen ? <ChevronUp className="w-4 h-4 text-white" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
          </div>
        </div>
      </button>

      {/* Panel Body */}
      {isOpen && (
        <div className="p-6 bg-white space-y-6 animate-fadeIn">
          {/* Simple Tab Header */}
          <div className="flex border-b border-slate-200 space-x-6 text-sm font-medium">
            <button
              onClick={() => setActiveTab('folders')}
              className={`pb-3 border-b-2 font-semibold transition-all flex items-center space-x-2 cursor-pointer ${
                activeTab === 'folders'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Folder className="w-4 h-4" />
              <span>1. フォルダ保存先設定</span>
            </button>

            <button
              onClick={() => setActiveTab('detection')}
              className={`pb-3 border-b-2 font-semibold transition-all flex items-center space-x-2 cursor-pointer ${
                activeTab === 'detection'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Settings2 className="w-4 h-4" />
              <span>2. 検出閾値リアルタイム調整 & テスト</span>
            </button>
          </div>

          {/* TAB 1: Folder Configurations */}
          {activeTab === 'folders' && (
            <div className="space-y-4 text-xs text-slate-700">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-3">
                <Folder className="w-5 h-5 text-slate-700 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-slate-800 text-xs">仕分け保存先フォルダの設定</h3>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    ドラッグ＆ドロップされたFAXファイルがマーク識別後に整理・コピーされるローカル/ネットワーク保存先フォルダパスを指定します。
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                {/* Purchase Order Target Folder */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="block font-bold text-slate-800 mb-1 flex items-center space-x-1.5">
                    <Square className="w-4 h-4 text-blue-600 fill-blue-600" />
                    <span>注文書 保存先フォルダ (■ 検出時)</span>
                  </label>
                  <input
                    type="text"
                    value={folderConfig.purchaseOrderFolder || ''}
                    onChange={(e) =>
                      onUpdateFolderConfig({
                        ...folderConfig,
                        purchaseOrderFolder: e.target.value,
                      })
                    }
                    placeholder="例: C:\FAX_Sorted\注文書"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    四隅に黒四角「■」が検出された注文書PDFの保存先。
                  </p>
                </div>

                {/* Stock Check Target Folder */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="block font-bold text-slate-800 mb-1 flex items-center space-x-1.5">
                    <Circle className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                    <span>在庫確認書類 保存先フォルダ (● 検出時)</span>
                  </label>
                  <input
                    type="text"
                    value={folderConfig.inventoryFolder || ''}
                    onChange={(e) =>
                      onUpdateFolderConfig({
                        ...folderConfig,
                        inventoryFolder: e.target.value,
                      })
                    }
                    placeholder="例: C:\FAX_Sorted\在庫確認"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    四隅に黒丸「●」が検出された在庫確認PDFの保存先。
                  </p>
                </div>

                {/* Other/Unmatched Folder */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="block font-bold text-slate-800 mb-1 flex items-center space-x-1.5">
                    <HelpCircle className="w-4 h-4 text-amber-600" />
                    <span>対象外 FAX保存先フォルダ</span>
                  </label>
                  <input
                    type="text"
                    value={folderConfig.unclassifiedFolder || ''}
                    onChange={(e) =>
                      onUpdateFolderConfig({
                        ...folderConfig,
                        unclassifiedFolder: e.target.value,
                      })
                    }
                    placeholder="例: C:\FAX_Sorted\手動確認"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    四隅マークが存在しない一般的な資料の振り分け先。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Realtime Detection Slider & Interactive Preview */}
          {activeTab === 'detection' && (
            <div className="space-y-6 text-xs text-slate-700">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Sliders Controls */}
                <div className="lg:col-span-5 space-y-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-bold text-slate-800 text-sm flex items-center space-x-1.5">
                      <Sliders className="w-4 h-4 text-slate-700" />
                      <span>検出パラメーター調整</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleResetSettings}
                      className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg flex items-center space-x-1 transition-all"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>初期値に戻す</span>
                    </button>
                  </div>

                  {/* 1. Dark Threshold */}
                  <div className="space-y-1 bg-white p-3 rounded-lg border border-slate-200">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-slate-800">
                        黒色濃淡 (輝度閾値)
                      </label>
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {detectionSettings.darkThreshold} / 255
                      </span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="220"
                      step="1"
                      value={detectionSettings.darkThreshold}
                      onChange={(e) =>
                        onUpdateDetectionSettings({
                          ...detectionSettings,
                          darkThreshold: Number(e.target.value),
                        })
                      }
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-700"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>濃い黒のみ (かすれ弱い)</span>
                      <span>薄い薄黒も検出 (ノイズ注意)</span>
                    </div>
                  </div>

                  {/* 2. Corner Margin Percent */}
                  <div className="space-y-1 bg-white p-3 rounded-lg border border-slate-200">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-slate-800">
                        四隅探知エリア
                      </label>
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        端から {detectionSettings.cornerMarginPercent}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="35"
                      step="1"
                      value={detectionSettings.cornerMarginPercent}
                      onChange={(e) =>
                        onUpdateDetectionSettings({
                          ...detectionSettings,
                          cornerMarginPercent: Number(e.target.value),
                        })
                      }
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-700"
                    />
                    <p className="text-[10px] text-slate-500">
                      スキャンズレでマークが内側に寄っている場合は広くします。
                    </p>
                  </div>

                  {/* 3. Min Mark Size */}
                  <div className="space-y-1 bg-white p-3 rounded-lg border border-slate-200">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-slate-800">
                        最小マークサイズ
                      </label>
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {detectionSettings.minMarkSizePx} px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="50"
                      step="1"
                      value={detectionSettings.minMarkSizePx}
                      onChange={(e) =>
                        onUpdateDetectionSettings({
                          ...detectionSettings,
                          minMarkSizePx: Number(e.target.value),
                        })
                      }
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-700"
                    />
                    <p className="text-[10px] text-slate-500">
                      小さな黒四角・黒丸を検出したい場合はサイズを小さく設定します。
                    </p>
                  </div>

                  {/* 4. Square & Circle Sensitivity */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                      <label className="font-bold text-slate-800 text-[11px] block">
                        ■ 四角感度 (充填度)
                      </label>
                      <span className="font-mono text-xs font-bold text-blue-600 block">
                        ≥ {detectionSettings.squareExtentThreshold}
                      </span>
                      <input
                        type="range"
                        min="0.50"
                        max="0.95"
                        step="0.02"
                        value={detectionSettings.squareExtentThreshold}
                        onChange={(e) =>
                          onUpdateDetectionSettings({
                            ...detectionSettings,
                            squareExtentThreshold: Number(e.target.value),
                          })
                        }
                        className="w-full h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                      <label className="font-bold text-slate-800 text-[11px] block">
                        ● 円形感度 (丸み)
                      </label>
                      <span className="font-mono text-xs font-bold text-emerald-600 block">
                        ≥ {detectionSettings.circularityThreshold}
                      </span>
                      <input
                        type="range"
                        min="0.50"
                        max="0.95"
                        step="0.02"
                        value={detectionSettings.circularityThreshold}
                        onChange={(e) =>
                          onUpdateDetectionSettings({
                            ...detectionSettings,
                            circularityThreshold: Number(e.target.value),
                          })
                        }
                        className="w-full h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-emerald-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: Real-time Interactive Test Canvas & Analysis Result */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Test Source Selector */}
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100 p-2 rounded-xl">
                    <span className="text-xs font-bold text-slate-700 px-2">
                      検証用テスト用紙:
                    </span>
                    <div className="flex items-center space-x-1.5 overflow-x-auto">
                      <button
                        type="button"
                        onClick={() => setTestSource('po')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1 ${
                          testSource === 'po'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>注文書 (■)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTestSource('stock')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1 ${
                          testSource === 'stock'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <Circle className="w-3.5 h-3.5 fill-current" />
                        <span>在庫確認 (●)</span>
                      </button>

                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleCustomUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1 ${
                          testSource === 'custom'
                            ? 'bg-slate-800 text-white shadow-xs'
                            : 'bg-white text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>実機画像...</span>
                      </button>
                    </div>
                  </div>

                  {/* Real-time Category Status Badge */}
                  {realtimeAnalysis && (
                    <div
                      className={`p-4 rounded-xl border flex items-center justify-between shadow-xs transition-all ${
                        realtimeAnalysis.detectedCategory === '注文書'
                          ? 'bg-blue-50 border-blue-200 text-blue-950'
                          : realtimeAnalysis.detectedCategory === '在庫確認'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                          : 'bg-rose-50 border-rose-200 text-rose-950'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {realtimeAnalysis.detectedCategory === '注文書' ? (
                          <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <Square className="w-6 h-6 fill-current" />
                          </div>
                        ) : realtimeAnalysis.detectedCategory === '在庫確認' ? (
                          <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <Circle className="w-6 h-6 fill-current" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <AlertCircle className="w-6 h-6" />
                          </div>
                        )}

                        <div>
                          <span className="text-xs text-slate-500 font-semibold block">
                            現在のパラメーターでの判定結果:
                          </span>
                          <span className="text-base font-extrabold flex items-center space-x-2">
                            <span>【 識別区分: {realtimeAnalysis.detectedCategory} 】</span>
                          </span>
                        </div>
                      </div>

                      <div className="text-right font-mono text-xs font-bold">
                        <div>
                          ■ 注文書マーク: {realtimeAnalysis.corners.filter((c) => c.detectedMark === 'square').length} 個
                        </div>
                        <div>
                          ● 在庫確認マーク: {realtimeAnalysis.corners.filter((c) => c.detectedMark === 'circle').length} 個
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Realtime Canvas Preview */}
                  <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden">
                    {isProcessing && (
                      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-10 text-white font-semibold space-x-2">
                        <Sparkles className="w-5 h-5 animate-spin text-indigo-400" />
                        <span>リアルタイム解析中...</span>
                      </div>
                    )}

                    <canvas
                      ref={previewCanvasRef}
                      className="max-h-[380px] w-auto max-w-full rounded border border-slate-700 shadow-lg object-contain bg-white"
                    />
                    <p className="text-[11px] text-slate-400 mt-2">
                      ※ スライダーを操作すると緑枠（探知エリア）内のマーク抽出がリアルタイムに更新されます
                    </p>
                  </div>

                  {/* 4 Corners Crop Detail Grid */}
                  {realtimeAnalysis && (
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      {realtimeAnalysis.corners.map((c, idx) => (
                        <div
                          key={idx}
                          className="bg-white border border-slate-200 rounded-lg p-2 text-center text-[10px] space-y-1 shadow-2xs"
                        >
                          <span className="font-bold text-slate-500 block">
                            {c.position === 'top-left'
                              ? '左上'
                              : c.position === 'top-right'
                              ? '右上'
                              : c.position === 'bottom-left'
                              ? '左下'
                              : '右下'}
                          </span>
                          <div className="w-full h-12 bg-slate-100 rounded overflow-hidden flex items-center justify-center border border-slate-200">
                            <img
                              src={c.cropDataUrl}
                              alt={c.position}
                              className="max-h-full max-w-full object-contain image-pixelated"
                            />
                          </div>
                          <span
                            className={`font-bold block px-1 py-0.5 rounded ${
                              c.detectedMark === 'square'
                                ? 'bg-blue-100 text-blue-800'
                                : c.detectedMark === 'circle'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {c.detectedMark === 'square'
                              ? '■ 四角'
                              : c.detectedMark === 'circle'
                              ? '● 円'
                              : 'なし'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Footer: Save Settings & Status Toast */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              {saveSuccessMessage ? (
                <div className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center space-x-1.5 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{saveSuccessMessage}</span>
                </div>
              ) : (
                <span className="text-xs text-slate-500 font-medium">
                  ※ 変更された検出感度・フォルダ設定はブラウザのローカルストレージに永続保存されます
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-sm flex items-center space-x-2 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>現在の設定を保存する</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
