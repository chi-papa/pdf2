import React, { useState } from 'react';
import { Folder, Settings2, Sliders, Info, Copy, RotateCcw, Circle, Square, ZoomIn, Contrast } from 'lucide-react';
import { DetectionSettings, FolderConfig } from '../types';
import { DEFAULT_DETECTION_SETTINGS } from '../utils/markDetector';

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

  const handleResetSettings = () => {
    onUpdateDetectionSettings(DEFAULT_DETECTION_SETTINGS);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6 transition-all">
      {/* Panel Header Toggle */}
      <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600">
            <Folder className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">監視フォルダ＆仕分け設定</h2>
            <p className="text-xs text-slate-500">
              監視フォルダ: <span className="font-mono text-indigo-600 font-semibold">{folderConfig.inputFolder}</span> | 保存先: 注文書, 在庫確認
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center space-x-1.5 transition-all shadow-xs"
        >
          <Sliders className="w-3.5 h-3.5 text-slate-500" />
          <span>{isOpen ? '設定を閉じる' : '設定を変更・微調整'}</span>
        </button>
      </div>

      {/* Expanded Settings Form */}
      {isOpen && (
        <div className="p-6 bg-white space-y-6 animate-fadeIn">
          {/* Tabs */}
          <div className="flex border-b border-slate-200 space-x-6 text-sm font-medium">
            <button
              onClick={() => setActiveTab('folders')}
              className={`pb-3 border-b-2 font-semibold transition-all flex items-center space-x-2 ${
                activeTab === 'folders'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Folder className="w-4 h-4" />
              <span>フォルダパス設定</span>
            </button>
            <button
              onClick={() => setActiveTab('detection')}
              className={`pb-3 border-b-2 font-semibold transition-all flex items-center space-x-2 ${
                activeTab === 'detection'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Settings2 className="w-4 h-4" />
              <span>四隅マーク画像解析しきい値調整</span>
            </button>
          </div>

          {activeTab === 'folders' ? (
            <div className="space-y-4 text-xs text-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Watch Folder */}
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    FAX受信監視フォルダ (Input Folder)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={folderConfig.inputFolder}
                      onChange={(e) =>
                        onUpdateFolderConfig({ ...folderConfig, inputFolder: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    FAX受信複合機が自動保存する共有フォルダを指定します。
                  </p>
                </div>

                {/* Purchase Order Target Folder */}
                <div>
                  <label className="block font-semibold text-slate-800 mb-1 flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
                    <span>注文書 保存先フォルダ (● 4個検出時)</span>
                  </label>
                  <input
                    type="text"
                    value={folderConfig.purchaseOrderFolder}
                    onChange={(e) =>
                      onUpdateFolderConfig({
                        ...folderConfig,
                        purchaseOrderFolder: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    四隅に黒丸「●」が4つ存在するPDFのコピー保存先。
                  </p>
                </div>

                {/* Inventory Inquiry Target Folder */}
                <div>
                  <label className="block font-semibold text-slate-800 mb-1 flex items-center space-x-1">
                    <span className="w-2 h-2 bg-emerald-600 inline-block"></span>
                    <span>在庫確認書類 保存先フォルダ (■ 4個検出時)</span>
                  </label>
                  <input
                    type="text"
                    value={folderConfig.inventoryFolder}
                    onChange={(e) =>
                      onUpdateFolderConfig({
                        ...folderConfig,
                        inventoryFolder: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    四隅に黒四角「■」が4つ存在するPDFのコピー保存先。
                  </p>
                </div>

                {/* Unclassified Target Folder */}
                <div>
                  <label className="block font-semibold text-slate-800 mb-1 flex items-center space-x-1">
                    <span className="w-2 h-2 bg-slate-400 inline-block"></span>
                    <span>対象外保存先 (マーク不一致時)</span>
                  </label>
                  <input
                    type="text"
                    value={folderConfig.unclassifiedFolder}
                    onChange={(e) =>
                      onUpdateFolderConfig({
                        ...folderConfig,
                        unclassifiedFolder: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    条件に一致しない標準FAXの仕分け先。
                  </p>
                </div>
              </div>

              {/* Behavior Switches */}
              <div className="pt-3 border-t border-slate-200 flex flex-wrap gap-6 text-xs font-medium text-slate-700">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={folderConfig.autoDeleteOriginal}
                    onChange={(e) =>
                      onUpdateFolderConfig({
                        ...folderConfig,
                        autoDeleteOriginal: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <span>仕分け完了後に受信フォルダの元PDFを自動移動（元データを残さない）</span>
                </label>
                <span className="text-slate-300">|</span>
                <div className="flex items-center space-x-1.5 text-indigo-700">
                  <Copy className="w-3.5 h-3.5" />
                  <span>基本動作：元データは保護し、指定フォルダへコピーを作成します。</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5 text-xs text-slate-700">
              <div className="flex items-start justify-between p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-lg text-indigo-950">
                <div className="flex items-start space-x-2.5">
                  <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">FAX四隅マーク認識の閾値（しきい値）調整</span>
                    <p className="text-[11px] text-indigo-800 mt-0.5">
                      FAX受信文書のかすれ・濃淡・スキャン位置のずれに応じて各パラメータの閾値をスライダーでリアルタイム調整できます。
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleResetSettings}
                  className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-indigo-200 text-indigo-700 font-semibold text-[11px] flex items-center space-x-1 shrink-0 transition-colors shadow-xs"
                  title="初期値に戻す"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>初期値にリセット</span>
                </button>
              </div>

              {/* Sliders Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* 1. Dark Threshold (輝度二値化) */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between font-semibold">
                    <label className="flex items-center space-x-1.5 text-slate-800">
                      <Contrast className="w-4 h-4 text-slate-600" />
                      <span>黒色判定 輝度閾値</span>
                    </label>
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded font-mono font-bold">
                      {detectionSettings.darkThreshold}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="200"
                    step="5"
                    value={detectionSettings.darkThreshold}
                    onChange={(e) =>
                      onUpdateDetectionSettings({
                        ...detectionSettings,
                        darkThreshold: Number(e.target.value),
                      })
                    }
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>30 (濃い黒のみ)</span>
                    <span>200 (淡い灰も検出)</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    FAXの印影や黒マークの明るさ限界。かすれFAX時は値を大きくして感度を上げます。
                  </p>
                </div>

                {/* 2. Circularity Threshold (円形度) */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between font-semibold">
                    <label className="flex items-center space-x-1.5 text-slate-800">
                      <Circle className="w-4 h-4 text-blue-600" />
                      <span>● 黒丸 円形度しきい値</span>
                    </label>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-mono font-bold">
                      {detectionSettings.circularityThreshold}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.50"
                    max="0.95"
                    step="0.05"
                    value={detectionSettings.circularityThreshold}
                    onChange={(e) =>
                      onUpdateDetectionSettings({
                        ...detectionSettings,
                        circularityThreshold: Number(e.target.value),
                      })
                    }
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>0.50 (歪んだ丸も許可)</span>
                    <span>0.95 (完全な真円のみ)</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    丸マークの形の正確さ（4π×面積 / 周長²）。潰れた丸を許容する場合は低めに設定します。
                  </p>
                </div>

                {/* 3. Square Extent Threshold (四角充填率) */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between font-semibold">
                    <label className="flex items-center space-x-1.5 text-slate-800">
                      <Square className="w-4 h-4 text-emerald-600" />
                      <span>■ 黒四角 充填率しきい値</span>
                    </label>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded font-mono font-bold">
                      {detectionSettings.squareExtentThreshold}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.50"
                    max="0.95"
                    step="0.05"
                    value={detectionSettings.squareExtentThreshold}
                    onChange={(e) =>
                      onUpdateDetectionSettings({
                        ...detectionSettings,
                        squareExtentThreshold: Number(e.target.value),
                      })
                    }
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>0.50 (欠けた正方形も可)</span>
                    <span>0.95 (緻密な正方形のみ)</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    外接矩形に対する黒画素の割合。欠けのある四角を拾う場合は低く設定します。
                  </p>
                </div>

                {/* 4. Corner Margin Percent (四隅クロップ切出幅) */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between font-semibold">
                    <label className="flex items-center space-x-1.5 text-slate-800">
                      <ZoomIn className="w-4 h-4 text-purple-600" />
                      <span>四隅切出幅 (ページ端からの%)</span>
                    </label>
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded font-mono font-bold">
                      {detectionSettings.cornerMarginPercent}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="25"
                    step="1"
                    value={detectionSettings.cornerMarginPercent}
                    onChange={(e) =>
                      onUpdateDetectionSettings({
                        ...detectionSettings,
                        cornerMarginPercent: Number(e.target.value),
                      })
                    }
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>5% (端のみ)</span>
                    <span>25% (広範囲)</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    ページの各角からマークを検索する領域の割合。位置ズレが大きい場合に広げます。
                  </p>
                </div>

                {/* 5. Min Mark Size (最小マークサイズ) */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between font-semibold">
                    <label className="flex items-center space-x-1.5 text-slate-800">
                      <span>最小マークサイズ (px)</span>
                    </label>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-mono font-bold">
                      {detectionSettings.minMarkSizePx} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="1"
                    value={detectionSettings.minMarkSizePx}
                    onChange={(e) =>
                      onUpdateDetectionSettings({
                        ...detectionSettings,
                        minMarkSizePx: Number(e.target.value),
                      })
                    }
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>5 px (小さな点も対象)</span>
                    <span>50 px (大きめのみ)</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    検出対象とする最小幅・高さ。スキャン時の小ゴミやノイズを除外します。
                  </p>
                </div>

                {/* 6. Max Mark Size (最大マークサイズ) */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between font-semibold">
                    <label className="flex items-center space-x-1.5 text-slate-800">
                      <span>最大マークサイズ (px)</span>
                    </label>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-mono font-bold">
                      {detectionSettings.maxMarkSizePx} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="300"
                    step="10"
                    value={detectionSettings.maxMarkSizePx}
                    onChange={(e) =>
                      onUpdateDetectionSettings({
                        ...detectionSettings,
                        maxMarkSizePx: Number(e.target.value),
                      })
                    }
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>50 px</span>
                    <span>300 px (大きな枠・太線も許容)</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    検出対象とする最大幅・高さ。大きな罫線やロゴなどを誤検出しないよう制限します。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

