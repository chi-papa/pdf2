import React from 'react';
import { Play, Pause, RefreshCw, FileCode, Sparkles, FolderSync, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  isMonitoring: boolean;
  onToggleMonitoring: () => void;
  onRunBatch: () => void;
  onOpenPythonGuide: () => void;
  onGenerateSamples: () => void;
  isProcessing: boolean;
  itemCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  isMonitoring,
  onToggleMonitoring,
  onRunBatch,
  onOpenPythonGuide,
  onGenerateSamples,
  isProcessing,
  itemCount,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* App Title and Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-500 to-cyan-400 p-0.5 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
              <FolderSync className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-100">
                FAX PDF 自動仕分けシステム
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                四隅マーク画像解析
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              注文書（●）/ 在庫確認（■）を自動抽出・別フォルダへ自動保存
            </p>
          </div>
        </div>

        {/* Monitoring Status Badge & Control Buttons */}
        <div className="flex items-center space-x-3">
          {/* Status Indicator */}
          <div
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
              isMonitoring
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isMonitoring ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
              }`}
            />
            <span className="font-semibold">
              {isMonitoring ? 'フォルダ監視中 (ON)' : '監視一時停止 (OFF)'}
            </span>
          </div>

          {/* Toggle Monitoring Button */}
          <button
            onClick={onToggleMonitoring}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm ${
              isMonitoring
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
            }`}
          >
            {isMonitoring ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>監視停止</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>監視開始</span>
              </>
            )}
          </button>

          {/* Run Batch Processing Now */}
          <button
            onClick={onRunBatch}
            disabled={isProcessing || itemCount === 0}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-sm shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>一括仕分け実行</span>
          </button>

          {/* Quick Generate Test Samples */}
          <button
            onClick={onGenerateSamples}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white transition-all shadow-sm shadow-indigo-600/20"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden md:inline">テストFAX生成</span>
          </button>

          {/* Open Python Design & Code Guide */}
          <button
            onClick={onOpenPythonGuide}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 hover:border-cyan-500/50 transition-all"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Python設計・コード</span>
          </button>
        </div>
      </div>
    </header>
  );
};
