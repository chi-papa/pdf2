import React from 'react';
import { RefreshCw, FileCode, Sparkles, FolderSync } from 'lucide-react';

interface HeaderProps {
  onRunBatch: () => void;
  onOpenPythonGuide: () => void;
  onGenerateSamples: () => void;
  isProcessing: boolean;
  itemCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onRunBatch,
  onOpenPythonGuide,
  onGenerateSamples,
  isProcessing,
  itemCount,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* App Title and Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 p-0.5 flex items-center justify-center shadow-md shadow-blue-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <FolderSync className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold tracking-tight text-white">
                FAX PDF 自動仕分けツール
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                四隅マーク解析
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              注文書（■）/ 在庫確認（●）をドラッグ＆ドロップで即座に判定・保存先仕分け
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Run Batch Processing */}
          {itemCount > 0 && (
            <button
              onClick={onRunBatch}
              disabled={isProcessing}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-sm shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>一括再仕分け</span>
            </button>
          )}

          {/* Quick Generate Test Samples */}
          <button
            onClick={onGenerateSamples}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white transition-all shadow-sm shadow-indigo-600/20 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden md:inline">テストFAX生成</span>
          </button>

          {/* Open Python Design & Code Guide */}
          <button
            onClick={onOpenPythonGuide}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 hover:border-cyan-500/40 transition-all cursor-pointer"
          >
            <FileCode className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Pythonコード</span>
          </button>
        </div>
      </div>
    </header>
  );
};

