import React, { useState } from 'react';
import { Terminal, Trash2, Search, Filter, CheckCircle2, AlertTriangle, Info, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { ProcessingLog } from '../types';

interface LogConsoleProps {
  logs: ProcessingLog[];
  onClearLogs: () => void;
}

export const LogConsole: React.FC<LogConsoleProps> = ({ logs, onClearLogs }) => {
  const [filterLevel, setFilterLevel] = useState<'all' | 'info' | 'success' | 'warning' | 'error'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isConsoleOpen, setIsConsoleOpen] = useState(true);

  const filteredLogs = logs.filter((log) => {
    const matchesLevel = filterLevel === 'all' || log.level === filterLevel;
    const matchesQuery =
      log.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesQuery;
  });

  const getLevelBadge = (level: ProcessingLog['level']) => {
    switch (level) {
      case 'success':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>仕分け完了</span>
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>対象外</span>
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3 h-3 text-rose-400" />
            <span>エラー</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Info className="w-3 h-3 text-blue-400" />
            <span>情報</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden font-mono text-xs text-slate-300 transition-all">
      {/* Console Header Toggle */}
      <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setIsConsoleOpen(!isConsoleOpen)}
          className="flex items-center space-x-3 text-left hover:opacity-80 transition-opacity cursor-pointer group"
        >
          <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 group-hover:border-cyan-500/40">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-100">FAX自動仕分け リアルタイム処理ログ (Live Audit Log)</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-cyan-300 font-bold border border-slate-700">
                全 {logs.length} 件
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              {isConsoleOpen ? 'クリックで処理ログ一覧をたたむ' : 'クリックで処理ログ一覧を展開表示'}
            </p>
          </div>
        </button>

        {/* Log Actions & Toggle Arrow */}
        <div className="flex items-center space-x-3 justify-between sm:justify-end">
          {isConsoleOpen && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="ログ検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-3 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200 w-36 focus:outline-none focus:border-cyan-500"
              />
            </div>
          )}

          {isConsoleOpen && (
            <button
              onClick={onClearLogs}
              disabled={logs.length === 0}
              className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 disabled:opacity-40 transition-all cursor-pointer"
              title="ログ消去"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsConsoleOpen(!isConsoleOpen)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-sans font-bold flex items-center space-x-1 cursor-pointer transition-all border border-slate-700"
          >
            <span>{isConsoleOpen ? 'ログをたたむ' : 'ログを開く'}</span>
            {isConsoleOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </button>
        </div>
      </div>

      {/* Console Log List */}
      {isConsoleOpen && (
        <div className="p-4 max-h-72 overflow-y-auto space-y-2 divide-y divide-slate-800/60">
          {filteredLogs.length === 0 ? (
            <div className="py-8 text-center text-slate-500 italic">
              処理ログはまだありません。
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="pt-2 flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-500 font-mono text-[11px]">{log.timestamp}</span>
                    {getLevelBadge(log.level)}
                    <span className="text-slate-100 font-bold">{log.fileName}</span>
                  </div>
                  <p className="text-slate-300 pl-1">{log.message}</p>
                </div>

                {log.category && (
                  <span className="shrink-0 text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    {log.category}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
