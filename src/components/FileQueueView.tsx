import React, { useState } from 'react';
import {
  FileText,
  Upload,
  Sparkles,
  Search,
  Trash2,
  Eye,
  CheckCircle2,
  FolderDown,
  ArrowRight,
  Filter,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { FaxDocument } from '../types';

interface FileQueueViewProps {
  documents: FaxDocument[];
  onUploadFiles: (files: FileList) => void;
  onGenerateSampleFiles: () => void;
  onInspectDocument: (doc: FaxDocument) => void;
  onProcessDocument: (docId: string) => void;
  onDeleteDocument: (docId: string) => void;
  onClearAll: () => void;
  activeFilter: 'all' | '注文書' | '在庫確認' | '対象外';
  onFilterChange: (filter: 'all' | '注文書' | '在庫確認' | '対象外') => void;
}

export const FileQueueView: React.FC<FileQueueViewProps> = ({
  documents,
  onUploadFiles,
  onGenerateSampleFiles,
  onInspectDocument,
  onProcessDocument,
  onDeleteDocument,
  onClearAll,
  activeFilter,
  onFilterChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Filter documents
  const filteredDocs = documents.filter((doc) => {
    const matchesFilter =
      activeFilter === 'all' ||
      doc.category === activeFilter ||
      (activeFilter === '対象外' && doc.category === '対象外');

    const matchesSearch = doc.fileName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUploadFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadFiles(e.target.files);
    }
  };

  const counts = {
    all: documents.length,
    purchaseOrder: documents.filter((d) => d.category === '注文書').length,
    inventory: documents.filter((d) => d.category === '在庫確認').length,
    unclassified: documents.filter((d) => d.category === '対象外').length,
  };

  return (
    <div className="space-y-6">
      {/* Upload Drag & Drop Zone / Quick Sample Bar */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`p-6 rounded-2xl border-2 border-dashed transition-all text-center relative overflow-hidden ${
          isDragOver
            ? 'border-blue-500 bg-blue-50/70 scale-[1.005]'
            : 'border-slate-300 bg-slate-50/60 hover:bg-blue-50/20 hover:border-blue-400 shadow-xs'
        }`}
      >
        <div className="max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto text-blue-600 shadow-xs">
            <Upload className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              FAX PDFファイルをここにドラッグ＆ドロップ
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              ファイルをドロップすると、即座に四隅マーク（注文書■ / 在庫確認●）が画像解析・自動仕分けされます
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <label className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs cursor-pointer shadow-sm transition-all flex items-center space-x-1.5">
              <Upload className="w-3.5 h-3.5 text-blue-100" />
              <span>ファイルを選択...</span>
              <input
                type="file"
                multiple
                accept=".pdf,image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </label>

            <button
              onClick={onGenerateSampleFiles}
              className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs border border-indigo-200 shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>ワンクリックでテスト用FAXサンプル生成 (■/●)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Document Queue Dashboard & Filter Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Controls Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Category Filter Tabs */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => onFilterChange('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>すべて</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-700 text-slate-200">
                {counts.all}
              </span>
            </button>

            <button
              onClick={() => onFilterChange('注文書')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeFilter === '注文書'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-blue-700 hover:bg-blue-50'
              }`}
            >
              <span className="w-2 h-2 rounded-xs bg-blue-400 inline-block" />
              <span>注文書 (■)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800 font-bold">
                {counts.purchaseOrder}
              </span>
            </button>

            <button
              onClick={() => onFilterChange('在庫確認')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeFilter === '在庫確認'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              <span>在庫確認 (●)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                {counts.inventory}
              </span>
            </button>

            <button
              onClick={() => onFilterChange('対象外')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeFilter === '対象外'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>対象外</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-bold">
                {counts.unclassified}
              </span>
            </button>
          </div>

          {/* Search & Actions */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="ファイル名で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs w-48 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {documents.length > 0 && (
              <button
                onClick={onClearAll}
                className="px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-semibold flex items-center space-x-1 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>リスト消去</span>
              </button>
            )}
          </div>
        </div>

        {/* Documents Table / Card List */}
        {filteredDocs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <FileText className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">表示できるFAX PDFはありません</p>
            <p className="text-xs text-slate-400">
              PDFをドラッグ＆ドロップするか「テストFAX生成」をクリックしてください。
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="p-4 hover:bg-slate-50/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* File Info */}
                <div className="flex items-start space-x-3">
                  <div
                    className={`p-2.5 rounded-xl border shrink-0 ${
                      doc.category === '注文書'
                        ? 'bg-blue-50 border-blue-200 text-blue-600'
                        : doc.category === '在庫確認'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                        : 'bg-slate-100 border-slate-200 text-slate-500'
                    }`}
                  >
                    <FileText className="w-6 h-6" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <span className="font-bold text-slate-800 text-sm">{doc.fileName}</span>

                      {/* Status Badge */}
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          doc.category === '注文書'
                            ? 'bg-blue-600 text-white'
                            : doc.category === '在庫確認'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {doc.category === '注文書'
                          ? '■ 注文書 (4個マーク一致)'
                          : doc.category === '在庫確認'
                          ? '● 在庫確認 (4個マーク一致)'
                          : '対象外 (マークなし)'}
                      </span>

                      {doc.pages && doc.pages.length > 1 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          {doc.pages.length} ページPDF (Page {doc.matchedPageNum || 1} 一致)
                        </span>
                      )}
                    </div>

                    {/* Metadata & Destination Path */}
                    <div className="text-xs text-slate-500 flex items-center space-x-3 flex-wrap">
                      <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                      <span>•</span>
                      <span>追加日時: {doc.uploadedAt}</span>
                      {doc.destinationPath && (
                        <>
                          <span>•</span>
                          <span className="text-indigo-600 font-mono font-medium flex items-center space-x-1">
                            <FolderDown className="w-3.5 h-3.5 inline mr-1" />
                            保存先: {doc.destinationPath}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => onInspectDocument(doc)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 hover:border-slate-400 bg-white text-slate-700 text-xs font-semibold flex items-center space-x-1 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-600" />
                    <span>四隅マーク詳細解析</span>
                  </button>

                  <button
                    onClick={() => onProcessDocument(doc.id)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1 shadow-sm transition-all"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>再仕分け</span>
                  </button>

                  <button
                    onClick={() => onDeleteDocument(doc.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
