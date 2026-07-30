import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { FolderConfigPanel } from './components/FolderConfigPanel';
import { FileQueueView } from './components/FileQueueView';
import { InspectionModal } from './components/InspectionModal';
import { LogConsole } from './components/LogConsole';
import { PythonGuideModal } from './components/PythonGuideModal';
import { SampleGeneratorModal } from './components/SampleGeneratorModal';

import { DetectionSettings, FaxDocument, FolderConfig, ProcessingLog } from './types';
import { DEFAULT_DETECTION_SETTINGS } from './utils/markDetector';
import { processPdfDocument } from './utils/pdfRenderer';
import { createSampleFaxPdf } from './utils/pdfGenerator';
import { FolderSync, FileText, CheckCircle2, ShieldAlert, Sparkles, Sliders } from 'lucide-react';

export default function App() {
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [documents, setDocuments] = useState<FaxDocument[]>([]);
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  
  // Modals & Panels
  const [inspectedDoc, setInspectedDoc] = useState<FaxDocument | null>(null);
  const [isPythonGuideOpen, setIsPythonGuideOpen] = useState(false);
  const [isSampleGenOpen, setIsSampleGenOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | '注文書' | '在庫確認' | '対象外'>('all');

  // Configurations
  const [folderConfig, setFolderConfig] = useState<FolderConfig>({
    inputFolder: '/FAX_Received',
    purchaseOrderFolder: '/FAX_Received/注文書',
    inventoryFolder: '/FAX_Received/在庫確認',
    unclassifiedFolder: '/FAX_Received/対象外',
    autoDeleteOriginal: false,
    createUnclassifiedSubfolder: true,
  });

  const [detectionSettings, setDetectionSettings] = useState<DetectionSettings>(DEFAULT_DETECTION_SETTINGS);

  // Helper log addition
  const addLog = useCallback(
    (
      level: 'info' | 'success' | 'warning' | 'error',
      fileName: string,
      message: string,
      category?: '注文書' | '在庫確認' | '対象外'
    ) => {
      const newLog: ProcessingLog = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toLocaleTimeString('ja-JP', { hour12: false }),
        level,
        fileName,
        message,
        category,
      };
      setLogs((prev) => [newLog, ...prev]);
    },
    []
  );

  // Initialize with initial sample files so user can see it in action immediately!
  useEffect(() => {
    const initDefaultSamples = async () => {
      try {
        // Sample 1: Purchase Order with 4 x ●
        const poBuffer = await createSampleFaxPdf({
          title: 'PURCHASE ORDER (注文書)',
          type: '注文書',
          pageCount: 2,
          supplierName: '日本産業機械株式会社',
          docNumber: 'PO-2026-701',
        });

        // Sample 2: Inventory Check with 4 x ■
        const invBuffer = await createSampleFaxPdf({
          title: 'INVENTORY INQUIRY (在庫照会)',
          type: '在庫確認',
          pageCount: 1,
          supplierName: '東海ロジスティクス',
          docNumber: 'INV-2026-412',
        });

        // Sample 3: Unmatched document
        const otherBuffer = await createSampleFaxPdf({
          title: 'ESTIMATE (見積書)',
          type: '対象外',
          pageCount: 1,
          supplierName: '関東金属ファクトリー',
          docNumber: 'EST-2026-901',
        });

        const initialDocs: FaxDocument[] = [
          {
            id: 'doc-sample-1',
            fileName: '注文書_日本産業機械_2P.pdf',
            fileSize: poBuffer.byteLength,
            uploadedAt: new Date().toLocaleTimeString('ja-JP', { hour12: false }),
            status: 'pending',
            pdfBuffer: poBuffer,
            pages: [],
          },
          {
            id: 'doc-sample-2',
            fileName: '在庫確認_東海ロジ_1P.pdf',
            fileSize: invBuffer.byteLength,
            uploadedAt: new Date().toLocaleTimeString('ja-JP', { hour12: false }),
            status: 'pending',
            pdfBuffer: invBuffer,
            pages: [],
          },
          {
            id: 'doc-sample-3',
            fileName: '一般見積書_関東金属_対象外.pdf',
            fileSize: otherBuffer.byteLength,
            uploadedAt: new Date().toLocaleTimeString('ja-JP', { hour12: false }),
            status: 'pending',
            pdfBuffer: otherBuffer,
            pages: [],
          },
        ];

        setDocuments(initialDocs);
        addLog('info', 'System', '初期サンプルFAX PDF 3件を個別ロードしました。分析を開始します。');
      } catch (err) {
        console.error('Initial samples loading error', err);
      }
    };

    initDefaultSamples();
  }, [addLog]);

  // Core Sorting Processor
  const processSingleDoc = useCallback(
    async (doc: FaxDocument) => {
      if (!doc.pdfBuffer) return;

      try {
        const pages = await processPdfDocument(doc.pdfBuffer.buffer, detectionSettings);

        // Determine category: if any page is '注文書' or '在庫確認'
        let matchedCategory: '注文書' | '在庫確認' | '対象外' = '対象外';
        let matchedPageNum = 1;

        for (const page of pages) {
          if (page.detectedCategory === '注文書') {
            matchedCategory = '注文書';
            matchedPageNum = page.pageNumber;
            break;
          } else if (page.detectedCategory === '在庫確認') {
            matchedCategory = '在庫確認';
            matchedPageNum = page.pageNumber;
            break;
          }
        }

        // Determine destination folder
        let destPath = folderConfig.unclassifiedFolder;
        if (matchedCategory === '注文書') {
          destPath = `${folderConfig.purchaseOrderFolder}/${doc.fileName}`;
        } else if (matchedCategory === '在庫確認') {
          destPath = `${folderConfig.inventoryFolder}/${doc.fileName}`;
        } else {
          destPath = `${folderConfig.unclassifiedFolder}/${doc.fileName}`;
        }

        // Update document record
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === doc.id
              ? {
                  ...d,
                  status: 'sorted',
                  category: matchedCategory,
                  matchedPageNum,
                  pages,
                  destinationPath: destPath,
                  processedAt: new Date().toLocaleTimeString('ja-JP', { hour12: false }),
                }
              : d
          )
        );

        if (matchedCategory === '注文書') {
          addLog(
            'success',
            doc.fileName,
            `四隅●(黒丸)を検出。${folderConfig.purchaseOrderFolder} へコピーを保存しました。`,
            '注文書'
          );
        } else if (matchedCategory === '在庫確認') {
          addLog(
            'success',
            doc.fileName,
            `四隅■(黒四角)を検出。${folderConfig.inventoryFolder} へコピーを保存しました。`,
            '在庫確認'
          );
        } else {
          addLog(
            'warning',
            doc.fileName,
            `四隅に該当マークが見つかりません。対象外(${folderConfig.unclassifiedFolder})として整理されました。`,
            '対象外'
          );
        }
      } catch (err: any) {
        console.error('Processing error:', err);
        setDocuments((prev) =>
          prev.map((d) => (d.id === doc.id ? { ...d, status: 'error', errorMessage: err.message } : d))
        );
        addLog('error', doc.fileName, `処理エラー: ${err.message || '解読失敗'}`);
      }
    },
    [detectionSettings, folderConfig, addLog]
  );

  // Run Batch Processing
  const handleRunBatch = useCallback(async () => {
    setIsProcessing(true);
    const pendingDocs = documents.filter((d) => d.status === 'pending');

    for (const doc of pendingDocs) {
      await processSingleDoc(doc);
    }
    setIsProcessing(false);
  }, [documents, processSingleDoc]);

  // Automated Watcher Trigger when isMonitoring is ON
  useEffect(() => {
    if (!isMonitoring || isProcessing) return;

    const pending = documents.find((d) => d.status === 'pending');
    if (pending) {
      setIsProcessing(true);
      processSingleDoc(pending).finally(() => setIsProcessing(false));
    }
  }, [isMonitoring, documents, isProcessing, processSingleDoc]);

  // File Upload Handlers
  const handleUploadFiles = async (fileList: FileList) => {
    const newDocs: FaxDocument[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList.item(i);
      if (!file) continue;

      const buffer = new Uint8Array(await file.arrayBuffer());
      const docId = 'doc-' + Math.random().toString(36).substring(2, 9);

      newDocs.push({
        id: docId,
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: new Date().toLocaleTimeString('ja-JP', { hour12: false }),
        status: 'pending',
        pdfBuffer: buffer,
        pages: [],
      });

      addLog('info', file.name, `受信フォルダ (${folderConfig.inputFolder}) へ手動追加されました。`);
    }

    setDocuments((prev) => [...newDocs, ...prev]);
  };

  const handleAddSampleToQueue = (fileName: string, pdfBuffer: Uint8Array) => {
    const docId = 'doc-sample-' + Math.random().toString(36).substring(2, 9);

    const newDoc: FaxDocument = {
      id: docId,
      fileName,
      fileSize: pdfBuffer.byteLength,
      uploadedAt: new Date().toLocaleTimeString('ja-JP', { hour12: false }),
      status: 'pending',
      pdfBuffer,
      pages: [],
    };

    setDocuments((prev) => [newDoc, ...prev]);
    addLog('info', fileName, `テスト用FAX PDFが受信フォルダへ生成・追加されました。`);
  };

  const handleForceCategoryChange = (docId: string, category: '注文書' | '在庫確認' | '対象外') => {
    setDocuments((prev) =>
      prev.map((d) => {
        if (d.id === docId) {
          let dest = folderConfig.unclassifiedFolder;
          if (category === '注文書') dest = `${folderConfig.purchaseOrderFolder}/${d.fileName}`;
          if (category === '在庫確認') dest = `${folderConfig.inventoryFolder}/${d.fileName}`;

          return { ...d, category, destinationPath: dest, status: 'sorted' };
        }
        return d;
      })
    );
    addLog('info', docId, `カテゴリが手動で [${category}] に変更されました。`);
  };

  const handleDeleteDocument = (docId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  };

  // Summary Counters
  const totalCount = documents.length;
  const poCount = documents.filter((d) => d.category === '注文書').length;
  const invCount = documents.filter((d) => d.category === '在庫確認').length;
  const otherCount = documents.filter((d) => d.category === '対象外').length;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans antialiased flex flex-col">
      {/* Top Header */}
      <Header
        isMonitoring={isMonitoring}
        onToggleMonitoring={() => setIsMonitoring(!isMonitoring)}
        onRunBatch={handleRunBatch}
        onOpenPythonGuide={() => setIsPythonGuideOpen(true)}
        onGenerateSamples={() => setIsSampleGenOpen(true)}
        isProcessing={isProcessing}
        itemCount={documents.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Statistics Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 block">全受信FAX件数</span>
              <span className="text-2xl font-black text-slate-900 font-mono mt-0.5 block">
                {totalCount} <span className="text-xs font-normal text-slate-400">件</span>
              </span>
            </div>
            <div className="p-3 bg-slate-100 rounded-xl text-slate-600">
              <FileText className="w-6 h-6" />
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-blue-100 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-blue-600 block">注文書 (● 検出)</span>
              <span className="text-2xl font-black text-blue-700 font-mono mt-0.5 block">
                {poCount} <span className="text-xs font-normal text-blue-400">件</span>
              </span>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-emerald-100 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-emerald-600 block">在庫確認 (■ 検出)</span>
              <span className="text-2xl font-black text-emerald-700 font-mono mt-0.5 block">
                {invCount} <span className="text-xs font-normal text-emerald-400">件</span>
              </span>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 block">対象外FAX</span>
              <span className="text-2xl font-black text-slate-700 font-mono mt-0.5 block">
                {otherCount} <span className="text-xs font-normal text-slate-400">件</span>
              </span>
            </div>
            <div className="p-3 bg-slate-100 rounded-xl text-slate-500">
              <ShieldAlert className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Watch Folder Configuration Panel */}
        <FolderConfigPanel
          folderConfig={folderConfig}
          onUpdateFolderConfig={setFolderConfig}
          detectionSettings={detectionSettings}
          onUpdateDetectionSettings={setDetectionSettings}
        />

        {/* File Queue & Management Dashboard */}
        <FileQueueView
          documents={documents}
          onUploadFiles={handleUploadFiles}
          onGenerateSampleFiles={() => setIsSampleGenOpen(true)}
          onInspectDocument={(doc) => setInspectedDoc(doc)}
          onProcessDocument={(docId) => {
            const doc = documents.find((d) => d.id === docId);
            if (doc) processSingleDoc(doc);
          }}
          onDeleteDocument={handleDeleteDocument}
          onClearAll={() => setDocuments([])}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />

        {/* Audit Log Console */}
        <LogConsole logs={logs} onClearLogs={() => setLogs([])} />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        FAX PDF 自動仕分けシステム &copy; 2026 | 四隅マーク画像解析 (● 注文書 / ■ 在庫確認)
      </footer>

      {/* Visual Corner Inspection Modal */}
      <InspectionModal
        doc={inspectedDoc}
        onClose={() => setInspectedDoc(null)}
        onForceCategoryChange={handleForceCategoryChange}
      />

      {/* Python Design & Code Modal */}
      <PythonGuideModal
        isOpen={isPythonGuideOpen}
        onClose={() => setIsPythonGuideOpen(false)}
      />

      {/* Sample Generator Modal */}
      <SampleGeneratorModal
        isOpen={isSampleGenOpen}
        onClose={() => setIsSampleGenOpen(false)}
        onAddSampleToQueue={handleAddSampleToQueue}
      />
    </div>
  );
}
