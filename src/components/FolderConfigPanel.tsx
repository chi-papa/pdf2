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
  FileText,
  Eye,
  Layers,
  ZoomIn,
  SlidersHorizontal,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { DetectionSettings, FolderConfig, PageAnalysis, FaxDocument } from '../types';
import { DEFAULT_DETECTION_SETTINGS, analyzeCanvasPage } from '../utils/markDetector';
import { createSampleFaxPdf } from '../utils/pdfGenerator';
import { processPdfDocument } from '../utils/pdfRenderer';

interface FolderConfigPanelProps {
  folderConfig: FolderConfig;
  onUpdateFolderConfig: (config: FolderConfig) => void;
  detectionSettings: DetectionSettings;
  onUpdateDetectionSettings: (settings: DetectionSettings) => void;
  documents?: FaxDocument[];
  onOpenFaxFormatGuide?: () => void;
}

export const FolderConfigPanel: React.FC<FolderConfigPanelProps> = ({
  folderConfig,
  onUpdateFolderConfig,
  detectionSettings,
  onUpdateDetectionSettings,
  documents = [],
  onOpenFaxFormatGuide,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'folders' | 'detection'>('folders');

  // Interactive Test & Detection Tuning State
  // testSource can be 'po' | 'stock' | 'custom' | `doc-${docId}`
  const [testSource, setTestSource] = useState<string>('po');
  const [customImageSrc, setCustomImageSrc] = useState<string | null>(null);
  const [realtimeAnalysis, setRealtimeAnalysis] = useState<PageAnalysis | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewViewMode, setPreviewViewMode] = useState<'corners' | 'full'>('corners');

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Save Toast Feedback
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Auto-switch to first real document when uploaded if currently on sample
  useEffect(() => {
    if (documents.length > 0 && testSource === 'po' && documents[0].pdfBuffer) {
      setTestSource(`doc-${documents[0].id}`);
    }
  }, [documents.length]);

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

      if (testSource.startsWith('doc-')) {
        const docId = testSource.replace('doc-', '');
        const doc = documents.find((d) => d.id === docId);

        if (doc && doc.pdfBuffer) {
          const analyses = await processPdfDocument(doc.pdfBuffer, detectionSettings);
          if (analyses.length > 0) {
            setRealtimeAnalysis(analyses[0]);
          }
        } else if (doc && doc.pages && doc.pages.length > 0) {
          setRealtimeAnalysis(doc.pages[0]);
        }
        setIsProcessing(false);
        return;
      } else if (testSource === 'po' || testSource === 'stock') {
        const type = testSource === 'po' ? '注文書' : '在庫確認';
        const pdfBytes = await createSampleFaxPdf({
          type,
          title: type === '注文書' ? 'サンプルFAX 注文書 (■)' : 'サンプルFAX 在庫確認 (●)',
        });

        const analyses = await processPdfDocument(pdfBytes, detectionSettings);
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
  }, [testSource, customImageSrc, detectionSettings, documents]);

  // Run detection when testSource or custom image or detectionSettings change
  useEffect(() => {
    if (isOpen && activeTab === 'detection') {
      runDetection();
    }
  }, [isOpen, activeTab, testSource, customImageSrc, detectionSettings, runDetection]);

  // Draw Overlay on Full Page Preview Canvas when analysis is updated
  useEffect(() => {
    if (previewViewMode !== 'full' || !previewCanvasRef.current || !realtimeAnalysis) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = realtimeAnalysis.pageImageDataUrl || '';
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
        ctx.lineWidth = Math.max(3, Math.round(canvas.width / 250));
        ctx.fillStyle = corner.detectedMark !== 'none' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.10)';
        ctx.fillRect(coord.x, coord.y, cropW, cropH);
        ctx.strokeRect(coord.x, coord.y, cropW, cropH);

        // Draw Mark Tag Badge
        const tagText =
          corner.detectedMark === 'square'
            ? '■ 注文書'
            : corner.detectedMark === 'circle'
            ? '● 在庫確認'
            : '未検出';

        const badgeBg =
          corner.detectedMark === 'square'
            ? '#2563eb'
            : corner.detectedMark === 'circle'
            ? '#059669'
            : '#e11d48';

        ctx.font = 'bold ' + Math.max(14, Math.round(canvas.width / 40)) + 'px sans-serif';
        const textMetrics = ctx.measureText(tagText);
        const padding = 8;
        const badgeW = textMetrics.width + padding * 2;
        const badgeH = Math.max(26, Math.round(canvas.width / 30));

        let bx = coord.x + 10;
        let by = coord.y + 10;
        if (corner.position === 'top-right' || corner.position === 'bottom-right') {
          bx = coord.x + cropW - badgeW - 10;
        }
        if (corner.position === 'bottom-left' || corner.position === 'bottom-right') {
          by = coord.y + cropH - badgeH - 10;
        }

        ctx.fillStyle = badgeBg;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(bx, by, badgeW, badgeH, 6) : ctx.rect(bx, by, badgeW, badgeH);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.fillText(tagText, bx + padding, by + badgeH - 7);
      });
    };
  }, [realtimeAnalysis, detectionSettings, previewViewMode]);

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

  const getPositionLabel = (pos: string) => {
    switch (pos) {
      case 'top-left':
        return '左上 (Top-Left)';
      case 'top-right':
        return '右上 (Top-Right)';
      case 'bottom-left':
        return '左下 (Bottom-Left)';
      case 'bottom-right':
        return '右下 (Bottom-Right)';
      default:
        return pos;
    }
  };

  return (
    <div
      className={`bg-white rounded-2xl border transition-all duration-200 mb-6 shadow-sm overflow-hidden ${
        isOpen ? 'border-blue-500/80 ring-2 ring-blue-500/10' : 'border-slate-200 hover:border-blue-400'
      }`}
    >
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
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              isOpen ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-slate-800 text-slate-100'
            }`}
          >
            <Sliders className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                設定 & パラメーター調整
              </span>
              <h2 className="font-bold text-slate-900 text-sm sm:text-base">
                環境設定 & マーク検出スライダー調整
              </h2>
            </div>
            <p className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-x-2">
              <span>保存先フォルダパス・二値化閾値スライダー・実機PDFリアルタイム検証</span>
              {!isOpen && (
                <span className="inline-flex items-center space-x-1 text-[11px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  <span>(現在値 閾値: {detectionSettings.darkThreshold}, 探知: {detectionSettings.cornerMarginPercent}%)</span>
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Clear Toggle Action Button */}
        <div className="flex items-center space-x-3 shrink-0 ml-2">
          <div
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all shadow-xs ${
              isOpen
                ? 'bg-blue-600 text-white shadow-blue-600/20'
                : 'bg-white text-slate-700 border border-slate-300 hover:border-blue-500 hover:text-blue-700'
            }`}
          >
            <span>{isOpen ? '設定パネルを閉じる' : '設定パネルを開く'}</span>
            {isOpen ? <ChevronUp className="w-4 h-4 text-white" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
          </div>
        </div>
      </button>

      {/* Expanded Config Content */}
      {isOpen && (
        <div className="p-5 sm:p-6 space-y-6">
          {/* Sub Navigation Tabs */}
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
              <span>保存先フォルダ設定</span>
            </button>

            <button
              onClick={() => setActiveTab('detection')}
              className={`pb-3 border-b-2 font-semibold transition-all flex items-center space-x-2 cursor-pointer ${
                activeTab === 'detection'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>マーク検出調整 (PCリアルタイム検証)</span>
            </button>
          </div>

          {/* TAB 1: Folder Configurations */}
          {activeTab === 'folders' && (
            <div className="space-y-4 text-xs text-slate-700">
              <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-100 flex items-start space-x-2.5">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-blue-900 leading-relaxed text-[11px]">
                  Python自動化ツール実行時に、判定結果(注文書/在庫確認/対象外)に応じてPDFが移動されるローカルフォルダパスを指定します。
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {/* Purchase Order Folder */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="block font-bold text-slate-800 mb-1 flex items-center space-x-1.5">
                    <Square className="w-4 h-4 text-blue-600 fill-blue-600" />
                    <span>■ 注文書 保存先フォルダ</span>
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
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    四隅に黒四角「■」が検出された注文書PDFの保存先。
                  </p>
                </div>

                {/* Inventory Check Folder */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="block font-bold text-slate-800 mb-1 flex items-center space-x-1.5">
                    <Circle className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                    <span>● 在庫確認 保存先フォルダ</span>
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
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
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
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    四隅マークが存在しない一般的な資料の振り分け先。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Realtime Detection Slider & PC Optimization Workspace */}
          {activeTab === 'detection' && (
            <div className="space-y-6 text-xs text-slate-700">
              {/* FAX Format Recommendation Banner */}
              <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-blue-900 text-white p-4 rounded-2xl border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-extrabold uppercase bg-emerald-500 text-slate-950 px-2 py-0.5 rounded">
                        推奨フォーマット規格
                      </span>
                      <h3 className="font-bold text-white text-xs sm:text-sm">
                        かすれたFAXでも100%検出させる帳票マーク印字ルール
                      </h3>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      記号サイズ<strong className="text-emerald-300"> 8mm〜12mm </strong>（黒ベタ完全塗りつぶし）/ 用紙端から<strong className="text-emerald-300"> 10mm〜15mm 内側 </strong>に配置すると最高精度になります。
                    </p>
                  </div>
                </div>

                {onOpenFaxFormatGuide && (
                  <button
                    type="button"
                    onClick={onOpenFaxFormatGuide}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center space-x-1.5 transition-all shadow-sm cursor-pointer shrink-0"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>推奨規格マニュアルを見る</span>
                  </button>
                )}
              </div>

              {/* PC Target Document Selection Toolbar */}
              <div className="bg-slate-900 text-white p-3.5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-slate-100 block">
                      検証対象のPDFドキュメントを選択
                    </span>
                    <span className="text-[11px] text-slate-400">
                      スライダーを移動させると、選択したPDFの四隅画像がリアルタイムに二値化再計算されます
                    </span>
                  </div>
                </div>

                {/* Document Selector Dropdown or Presets */}
                <div className="flex items-center space-x-2 overflow-x-auto">
                  <select
                    value={testSource}
                    onChange={(e) => setTestSource(e.target.value)}
                    className="px-3 py-1.5 bg-slate-800 border border-slate-700 hover:border-blue-500 text-white text-xs font-bold rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <optgroup label="▼ キュー内の実際のPDFファイル">
                      {documents.length === 0 && (
                        <option value="" disabled>
                          (実際のPDFがまだドロップされていません)
                        </option>
                      )}
                      {documents.map((doc, idx) => (
                        <option key={doc.id} value={`doc-${doc.id}`}>
                          📄 実機: {doc.fileName} ({doc.category || '未分類'})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="▼ テストサンプル用規定テンプレート">
                      <option value="po">■ サンプル注文書 (黒四角×4)</option>
                      <option value="stock">● サンプル在庫確認 (黒丸×4)</option>
                    </optgroup>
                    {customImageSrc && (
                      <optgroup label="▼ カスタム画像">
                        <option value="custom">🖼️ アップロードした画像</option>
                      </optgroup>
                    )}
                  </select>

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
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-500 transition-all flex items-center space-x-1.5 cursor-pointer shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-400" />
                    <span>別画像読み込み</span>
                  </button>
                </div>
              </div>

              {/* Main PC Split Grid Layout (Left: Sliders | Right: Interactive Scope & Visualizer) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Sliders Controls (4 Cols on PC) */}
                <div className="lg:col-span-5 space-y-4 bg-slate-50/90 p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                      <Sliders className="w-4 h-4 text-blue-600" />
                      <span>二値化 & 探知スライダー</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleResetSettings}
                      className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg flex items-center space-x-1 transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3 text-slate-500" />
                      <span>初期値に戻す</span>
                    </button>
                  </div>

                  {/* 1. Dark Threshold (二値化 輝度閾値) */}
                  <div className="space-y-1 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-slate-900 flex items-center space-x-1.5">
                        <span>1. 二値化 輝度閾値 (Dark Threshold)</span>
                      </label>
                      <span className="font-mono font-extrabold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
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
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                      <span>薄い文字も拾う (濃いめ)</span>
                      <span>濃い黒のみ拾う (厳格)</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                      かすれたFAXはスライダーを右に動かす（140→180）と黒マークとして認識されやすくなります。
                    </p>
                  </div>

                  {/* 2. Corner Margin Percent */}
                  <div className="space-y-1 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-slate-900">
                        2. 四隅探知エリア (Corner Margin)
                      </label>
                      <span className="font-mono font-extrabold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
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
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <p className="text-[10px] text-slate-500">
                      スキャンズレでマークが用紙の内側に印刷されている場合、探知パーセントを大きく（18%→25%）します。
                    </p>
                  </div>

                  {/* 3. Min Mark Size */}
                  <div className="space-y-1 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-slate-900">
                        3. 最小マークサイズ (Min Size)
                      </label>
                      <span className="font-mono font-extrabold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
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
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <p className="text-[10px] text-slate-500">
                      小さな印字マークを拾いたい場合はpxサイズを小さく調整します。
                    </p>
                  </div>

                  {/* 4. Square & Circle Sensitivity */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1 shadow-2xs">
                      <label className="font-bold text-slate-900 text-[11px] block">
                        ■ 四角形判定 (充填度)
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
                        className="w-full h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1 shadow-2xs">
                      <label className="font-bold text-slate-900 text-[11px] block">
                        ● 円形判定 (丸み)
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
                        className="w-full h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-emerald-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: Interactive Scope & Visual Inspection (7 Cols on PC) */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Realtime Category Classification Summary Banner */}
                  {realtimeAnalysis && (
                    <div
                      className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-all ${
                        realtimeAnalysis.detectedCategory === '注文書'
                          ? 'bg-blue-50/90 border-blue-200 text-blue-900'
                          : realtimeAnalysis.detectedCategory === '在庫確認'
                          ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
                          : 'bg-amber-50/90 border-amber-200 text-amber-900'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-xs shrink-0 ${
                            realtimeAnalysis.detectedCategory === '注文書'
                              ? 'bg-blue-600'
                              : realtimeAnalysis.detectedCategory === '在庫確認'
                              ? 'bg-emerald-600'
                              : 'bg-amber-600'
                          }`}
                        >
                          {realtimeAnalysis.detectedCategory === '注文書' ? (
                            <Square className="w-5 h-5 fill-current" />
                          ) : realtimeAnalysis.detectedCategory === '在庫確認' ? (
                            <Circle className="w-5 h-5 fill-current" />
                          ) : (
                            <HelpCircle className="w-5 h-5" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-white/80 border border-slate-200/60">
                              リアルタイム判定結果
                            </span>
                            <span className="font-extrabold text-sm sm:text-base">
                              【{realtimeAnalysis.detectedCategory}】へ分類
                            </span>
                          </div>
                          <p className="text-xs opacity-80 mt-0.5">
                            検出結果: 黒四角「■」× {realtimeAnalysis.corners.filter((c) => c.detectedMark === 'square').length} 個 / 黒丸「●」× {realtimeAnalysis.corners.filter((c) => c.detectedMark === 'circle').length} 個
                          </p>
                        </div>
                      </div>

                      {/* Display Switch Mode */}
                      <div className="flex bg-white p-1 rounded-xl border border-slate-200/80 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewViewMode('corners')}
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer ${
                            previewViewMode === 'corners'
                              ? 'bg-slate-900 text-white shadow-xs'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <ZoomIn className="w-3.5 h-3.5 text-cyan-400" />
                          <span>四隅二値化スコープ (PC推奨)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewViewMode('full')}
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer ${
                            previewViewMode === 'full'
                              ? 'bg-slate-900 text-white shadow-xs'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <Layers className="w-3.5 h-3.5 text-cyan-400" />
                          <span>全体プレビュー</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Mode A: Four Corner Binarized Inspection Scope (Zoom Cards) */}
                  {previewViewMode === 'corners' && realtimeAnalysis && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="font-bold text-xs flex items-center space-x-1.5">
                          <Eye className="w-4 h-4 text-blue-600" />
                          <span>四隅クロップ＆二値化処理（Thresholding）詳細画面</span>
                        </span>
                        <span className="text-[11px] text-slate-500">
                          左: カラー原画 / 右: 二値化白黒抽出 (黒画素がマークとして解析されます)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {realtimeAnalysis.corners.map((corner) => (
                          <div
                            key={corner.position}
                            className={`bg-white p-3.5 rounded-2xl border-2 shadow-2xs space-y-2.5 transition-all ${
                              corner.detectedMark === 'square'
                                ? 'border-blue-500/60 bg-blue-50/20'
                                : corner.detectedMark === 'circle'
                                ? 'border-emerald-500/60 bg-emerald-50/20'
                                : 'border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <span className="font-bold text-slate-900 text-xs flex items-center space-x-1">
                                <span>{getPositionLabel(corner.position)}</span>
                              </span>

                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                                  corner.detectedMark === 'square'
                                    ? 'bg-blue-600 text-white'
                                    : corner.detectedMark === 'circle'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-rose-100 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {corner.detectedMark === 'square' ? (
                                  <>
                                    <Square className="w-3 h-3 fill-current" />
                                    <span>■ 注文書マーク ({corner.confidence}%)</span>
                                  </>
                                ) : corner.detectedMark === 'circle' ? (
                                  <>
                                    <Circle className="w-3 h-3 fill-current" />
                                    <span>● 在庫マーク ({corner.confidence}%)</span>
                                  </>
                                ) : (
                                  <span>マーク未検出</span>
                                )}
                              </span>
                            </div>

                            {/* Dual Side-by-Side Crop Viewer (Original Crop vs Binarized Crop) */}
                            <div className="grid grid-cols-2 gap-2">
                              {/* Left: Original Crop */}
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-slate-500 block text-center">
                                  スキャン原画
                                </span>
                                <div className="aspect-square bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center p-1 relative">
                                  {corner.cropDataUrl ? (
                                    <img
                                      src={corner.cropDataUrl}
                                      alt={corner.position}
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <span className="text-[10px] text-slate-400">No Image</span>
                                  )}
                                </div>
                              </div>

                              {/* Right: Binarized Black & White Crop */}
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-blue-700 block text-center">
                                  二値化白黒抽出 (閾値:{detectionSettings.darkThreshold})
                                </span>
                                <div className="aspect-square bg-slate-900 rounded-xl overflow-hidden border border-slate-700 flex items-center justify-center p-1 relative shadow-inner">
                                  {corner.binaryCropDataUrl ? (
                                    <img
                                      src={corner.binaryCropDataUrl}
                                      alt={`${corner.position}-binary`}
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <span className="text-[10px] text-slate-500">No Binary</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Corner Shape Metrics Breakdown */}
                            <div className="bg-slate-50 p-2 rounded-xl text-[10px] font-mono grid grid-cols-3 gap-1 text-center text-slate-600 border border-slate-200/80">
                              <div>
                                <span className="text-slate-400 block text-[9px]">充填度(Extent)</span>
                                <span className="font-bold text-slate-800">{corner.shapeMetric.extent}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[9px]">丸み(Circularity)</span>
                                <span className="font-bold text-slate-800">{corner.shapeMetric.circularity}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[9px]">黒画素比率</span>
                                <span className="font-bold text-slate-800">{corner.shapeMetric.blackPixelRatio}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mode B: Full Page Preview Canvas */}
                  {previewViewMode === 'full' && (
                    <div className="space-y-2">
                      <span className="font-bold text-xs text-slate-700 flex items-center space-x-1.5">
                        <Layers className="w-4 h-4 text-blue-600" />
                        <span>全ページプレビュー & コーナーROI緑/赤枠オーバーレイ</span>
                      </span>

                      <div className="bg-slate-900 rounded-2xl p-3 border border-slate-800 shadow-md overflow-hidden flex items-center justify-center min-h-[360px] max-h-[520px]">
                        {isProcessing ? (
                          <div className="text-center py-12 text-slate-400 space-y-2">
                            <Sparkles className="w-6 h-6 animate-spin text-cyan-400 mx-auto" />
                            <p className="text-xs">解析中...</p>
                          </div>
                        ) : (
                          <canvas
                            ref={previewCanvasRef}
                            className="max-w-full max-h-[480px] object-contain rounded-lg shadow-2xl border border-slate-700"
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Toolbar Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                {saveSuccessMessage && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center space-x-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{saveSuccessMessage}</span>
                  </span>
                )}
                {!saveSuccessMessage && (
                  <span className="text-xs text-slate-500">
                    設定変更後は「現在の設定を保存する」をクリックして保存してください。
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-sm flex items-center space-x-2 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>現在の設定を保存する</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
