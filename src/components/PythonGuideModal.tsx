import React, { useState } from 'react';
import {
  X,
  FileCode,
  Download,
  Copy,
  Check,
  BookOpen,
  Terminal,
  Cpu,
  Layers,
  CheckCircle2,
  FolderSync,
  Play,
  Settings2,
} from 'lucide-react';

interface PythonGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PythonGuideModal: React.FC<PythonGuideModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'design' | 'code' | 'install'>('design');

  if (!isOpen) return null;

  const pythonScriptCode = `import os
import shutil
import time
import threading
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import cv2
import numpy as np
from PIL import Image, ImageTk
from pdf2image import convert_from_path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# ==========================================
# FAX PDF 自動仕分けコア解析ロジック
# ==========================================

class FaxMarkDetector:
    """PDFの四隅画像から黒丸●および黒四角■を検出・判別するクラス"""
    
    def __init__(self, corner_margin_ratio=0.15, dark_threshold=120):
        self.corner_margin_ratio = corner_margin_ratio
        self.dark_threshold = dark_threshold

    def analyze_pdf(self, pdf_path):
        """
        PDFファイルを受け取り、全ページを画像化して四隅マークを解析。
        1ページでも判定基準に一致すればその分類を返却。
        :return: '注文書', '在庫確認', または '対象外'
        """
        try:
            # pdf2imageでPDFページをPIL Imageへ変換
            images = convert_from_path(pdf_path, dpi=150)
        except Exception as e:
            print(f"PDF変換エラー: {e}")
            return "対象外", f"PDF画像変換失敗: {e}"

        for page_idx, pil_image in enumerate(images, start=1):
            # OpenCV用NumPy配列に変換 (RGB -> BGR)
            open_cv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
            
            # 各ページの四隅マーク判定
            category, details = self.analyze_page_image(open_cv_image)
            if category in ["注文書", "在庫確認"]:
                return category, f"Page {page_idx} にて{category}の四隅マーク({details})を検出"

        return "対象外", "該当する四隅識別マークは検出されませんでした"

    def analyze_page_image(self, img):
        """1ページの画像から四隅領域(TL, TR, BL, BR)を切り出して輪郭解析"""
        h, w = img.shape[:2]
        crop_w = int(w * self.corner_margin_ratio)
        crop_h = int(h * self.corner_margin_ratio)

        # 四隅領域の定義
        corners = {
            "top_left": img[0:crop_h, 0:crop_w],
            "top_right": img[0:crop_h, w-crop_w:w],
            "bottom_left": img[h-crop_h:h, 0:crop_w],
            "bottom_right": img[h-crop_h:h, w-crop_w:w],
        }

        circle_count = 0
        square_count = 0

        for pos, crop in corners.items():
            mark = self.detect_shape_in_crop(crop)
            if mark == "circle":
                circle_count += 1
            elif mark == "square":
                square_count += 1

        if square_count >= 2:
            return "注文書", f"四隅に■黒四角 {square_count}個 検出"
        elif circle_count >= 2:
            return "在庫確認", f"四隅に●黒丸 {circle_count}個 検出"

        return "対象外", f"■={square_count}, ●={circle_count}"

    def detect_shape_in_crop(self, crop_img):
        """切り出し画像内の黒色物体から円形度・矩形充填度を計算して形状識別"""
        gray = cv2.cvtColor(crop_img, cv2.COLOR_BGR2GRAY)
        
        # 二値化 (黒マークを白(255)として抽出)
        _, thresh = cv2.threshold(gray, self.dark_threshold, 255, cv2.THRESH_BINARY_INV)

        # 輪郭抽出
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        crop_h, crop_w = crop_img.shape[:2]
        min_area = (crop_w * crop_h) * 0.005  # 面積下限 0.5%
        max_area = (crop_w * crop_h) * 0.08   # 面積上限 8%

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if min_area <= area <= max_area:
                perimeter = cv2.arcLength(cnt, True)
                if perimeter == 0:
                    continue
                
                # 外接矩形
                x, y, bw, bh = cv2.boundingRect(cnt)
                if bw == 0 or bh == 0:
                    continue

                aspect_ratio = min(bw, bh) / max(bw, bh)
                extent = area / (bw * bh) # 充填度
                circularity = (4 * np.pi * area) / (perimeter * perimeter) # 円形度

                # 丸 (●) 判定: 高円形度(>0.72) & 外接矩形のアスペクト比が1に近い
                if circularity >= 0.72 and aspect_ratio >= 0.70 and 0.65 <= extent <= 0.88:
                    return "circle"
                
                # 四角 (■) 判定: 高充填度(>0.80) & 外接矩形のアスペクト比が1に近い
                elif extent >= 0.80 and aspect_ratio >= 0.75:
                    return "square"

        return "none"


# ==========================================
# フォルダ監視ハンドラー (Watchdog)
# ==========================================

class PdfWatchHandler(FileSystemEventHandler):
    def __init__(self, sorter_app):
        self.sorter_app = sorter_app

    def on_created(self, event):
        if not event.is_directory and event.src_path.lower().endswith('.pdf'):
            self.sorter_app.log_message(f"新規PDF受信を検知: {os.path.basename(event.src_path)}")
            # ファイル書き込み完了を少し待機
            time.sleep(1.0)
            self.sorter_app.process_single_pdf(event.src_path)


# ==========================================
# GUI アプリケーション (Tkinter)
# ==========================================

class FaxSorterApp:
    def __init__(self, root):
        self.root = root
        self.root.title("FAX PDF 自動仕分けアプリ (四隅マーク識別)")
        self.root.geometry("780x560")
        self.root.configure(bg="#1e293b")

        self.detector = FaxMarkDetector()
        self.observer = None
        self.is_monitoring = False

        # デフォルトフォルダパス
        self.input_dir = tk.StringVar(value=os.path.abspath("./FAX_Received"))
        self.po_dir = tk.StringVar(value=os.path.abspath("./FAX_Received/注文書"))
        self.inv_dir = tk.StringVar(value=os.path.abspath("./FAX_Received/在庫確認"))

        self.setup_ui()

    def setup_ui(self):
        # スタイル設定
        style = ttk.Style()
        style.theme_use('clam')

        # ヘッダー
        header = tk.Frame(self.root, bg="#0f172a", py=10)
        header.pack(fill="x")
        title = tk.Label(header, text="FAX PDF 自動仕分けシステム", font=("Helvetica", 14, "bold"), fg="#38bdf8", bg="#0f172a")
        title.pack(side="left", px=15)

        self.status_label = tk.Label(header, text="● 監視停止中", font=("Helvetica", 10, "bold"), fg="#f59e0b", bg="#0f172a")
        self.status_label.pack(side="right", px=15)

        # フォルダ設定フレーム
        folder_frame = tk.LabelFrame(self.root, text=" 監視・仕分けフォルダ設定 ", bg="#1e293b", fg="#cbd5e1", font=("Helvetica", 10, "bold"), padx=10, pady=10)
        folder_frame.pack(fill="x", padx=15, pady=10)

        # 監視フォルダ
        self.create_folder_row(folder_frame, "監視フォルダ:", self.input_dir, 0)
        # 注文書保存先
        self.create_folder_row(folder_frame, "注文書(●)保存先:", self.po_dir, 1)
        # 在庫確認保存先
        self.create_folder_row(folder_frame, "在庫確認(■)保存先:", self.inv_dir, 2)

        # ボタンエリア
        btn_frame = tk.Frame(self.root, bg="#1e293b")
        btn_frame.pack(fill="x", padx=15, pady=5)

        self.start_btn = tk.Button(btn_frame, text="▶ フォルダ監視開始", command=self.toggle_monitoring, bg="#10b981", fg="white", font=("Helvetica", 10, "bold"), px=15, py=6, relief="flat")
        self.start_btn.pack(side="left", mr=10)

        self.run_once_btn = tk.Button(btn_frame, text="🔄 既存PDFを一括仕分け", command=self.run_batch, bg="#2563eb", fg="white", font=("Helvetica", 10, "bold"), px=15, py=6, relief="flat")
        self.run_once_btn.pack(side="left")

        # ログ表示エリア
        log_frame = tk.LabelFrame(self.root, text=" 処理ログログ表示 ", bg="#1e293b", fg="#cbd5e1", font=("Helvetica", 10, "bold"), padx=10, pady=10)
        log_frame.pack(fill="both", expand=True, padx=15, pady=10)

        self.log_text = tk.Text(log_frame, bg="#0f172a", fg="#e2e8f0", font=("Consolas", 9), wrap="word")
        self.log_text.pack(fill="both", expand=True, side="left")

        scrollbar = tk.Scrollbar(log_frame, command=self.log_text.yview)
        scrollbar.pack(side="right", fill="y")
        self.log_text.config(yscrollcommand=scrollbar.set)

        self.log_message("アプリが起動しました。監視開始ボタンまたは一括仕分けを実行してください。")

    def create_folder_row(self, parent, label_text, text_var, row):
        lbl = tk.Label(parent, text=label_text, bg="#1e293b", fg="#94a3b8", font=("Helvetica", 9), width=16, anchor="e")
        lbl.grid(row=row, column=0, px=5, py=4, sticky="e")

        entry = tk.Entry(parent, textvariable=text_var, font=("Consolas", 9), bg="#0f172a", fg="#f8fafc", insertbackground="white")
        entry.grid(row=row, column=1, px=5, py=4, sticky="ew")

        btn = tk.Button(parent, text="参照...", command=lambda: self.browse_folder(text_var), bg="#334155", fg="white", font=("Helvetica", 8))
        btn.grid(row=row, column=2, px=5, py=4)

        parent.grid_columnconfigure(1, weight=1)

    def browse_folder(self, target_var):
        path = filedialog.askdirectory()
        if path:
            target_var.set(os.path.abspath(path))

    def log_message(self, msg):
        timestamp = time.strftime("[%H:%M:%S]")
        self.log_text.insert(tk.END, f"{timestamp} {msg}\n")
        self.log_text.see(tk.END)

    def toggle_monitoring(self):
        if not self.is_monitoring:
            input_path = self.input_dir.get()
            if not os.path.exists(input_path):
                os.makedirs(input_path, exist_ok=True)

            event_handler = PdfWatchHandler(self)
            self.observer = Observer()
            self.observer.schedule(event_handler, input_path, recursive=False)
            self.observer.start()

            self.is_monitoring = True
            self.start_btn.config(text="⏹ 監視停止", bg="#ef4444")
            self.status_label.config(text="● フォルダ監視中", fg="#10b981")
            self.log_message(f"フォルダ監視を開始しました: {input_path}")
        else:
            if self.observer:
                self.observer.stop()
                self.observer.join()
            self.is_monitoring = False
            self.start_btn.config(text="▶ フォルダ監視開始", bg="#10b981")
            self.status_label.config(text="● 監視停止中", fg="#f59e0b")
            self.log_message("フォルダ監視を停止しました。")

    def run_batch(self):
        threading.Thread(target=self._batch_process_thread, daemon=True).start()

    def _batch_process_thread(self):
        input_path = self.input_dir.get()
        if not os.path.exists(input_path):
            self.log_message(f"エラー: 監視フォルダが存在しません: {input_path}")
            return

        files = [f for f in os.listdir(input_path) if f.lower().endswith('.pdf')]
        self.log_message(f"一括処理開始: {len(files)} 件のPDFを解析中...")

        for f in files:
            full_path = os.path.join(input_path, f)
            self.process_single_pdf(full_path)

        self.log_message("一括処理が完了しました。")

    def process_single_pdf(self, pdf_path):
        filename = os.path.basename(pdf_path)
        
        # フォルダ作成
        po_path = self.po_dir.get()
        inv_path = self.inv_dir.get()
        os.makedirs(po_path, exist_ok=True)
        os.makedirs(inv_path, exist_ok=True)

        # 解析
        category, details = self.detector.analyze_pdf(pdf_path)

        if category == "注文書":
            target_dest = os.path.join(po_path, filename)
            shutil.copy2(pdf_path, target_dest)
            self.log_message(f"【注文書 ●】 -> {filename} を [{po_path}] へ保存完了 ({details})")
        elif category == "在庫確認":
            target_dest = os.path.join(inv_path, filename)
            shutil.copy2(pdf_path, target_dest)
            self.log_message(f"【在庫確認 ■】 -> {filename} を [{inv_path}] へ保存完了 ({details})")
        else:
            self.log_message(f"【対象外】 -> {filename} は条件マーク不一致のため無視されました")


if __name__ == "__main__":
    root = tk.Tk()
    app = FaxSorterApp(root)
    root.mainloop()
`;

  const copyCodeToClipboard = () => {
    navigator.clipboard.writeText(pythonScriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadPythonScript = () => {
    const blob = new Blob([pythonScriptCode], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fax_auto_sorter_gui.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">
                Python版 FAX PDF自動仕分け設計書＆ソースコード
              </h3>
              <p className="text-xs text-slate-400">
                初心者向け手順解説 / Tkinter GUI付きコード / 1クリックダウンロード可能
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="bg-slate-100 px-6 pt-3 border-b border-slate-200 flex space-x-6 text-xs font-bold text-slate-600">
          <button
            onClick={() => setActiveTab('design')}
            className={`pb-3 border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'design'
                ? 'border-indigo-600 text-indigo-600 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>1. システム設計・アルゴリズム構造</span>
          </button>

          <button
            onClick={() => setActiveTab('install')}
            className={`pb-3 border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'install'
                ? 'border-indigo-600 text-indigo-600 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>2. 環境構築・ライブラリ準備手順</span>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`pb-3 border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'code'
                ? 'border-indigo-600 text-indigo-600 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCode className="w-4 h-4 text-cyan-600" />
            <span>3. Python完全コード (`fax_auto_sorter_gui.py`)</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 text-slate-700 space-y-6 text-xs leading-relaxed bg-slate-50">
          {activeTab === 'design' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Architecture Overview */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
                <h4 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>基本設計と判定アルゴリズム (System Architecture Design)</span>
                </h4>
                <p className="text-slate-600">
                  本システムは、FAX受信フォルダに蓄積されるPDFの四隅領域（Top-Left, Top-Right, Bottom-Left, Bottom-Right）をOpenCVで幾何学解析し、
                  送信時に配置された識別マーク（●黒丸 / ■黒四角）に基づいて目的のフォルダへ自動複製・整理するデスクトップツールです。
                </p>

                {/* Workflow Diagram */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 rounded-lg bg-indigo-50/70 border border-indigo-100 space-y-1">
                    <span className="text-[10px] font-bold text-indigo-600 font-mono">STEP 1</span>
                    <div className="font-bold text-slate-800">1. PDF受信監視</div>
                    <p className="text-[11px] text-slate-500">
                      `watchdog` スレッドがフォルダを常時監視し、新着PDFをリアルタイム検出。
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-100 space-y-1">
                    <span className="text-[10px] font-bold text-blue-600 font-mono">STEP 2</span>
                    <div className="font-bold text-slate-800">2. 画像化・四隅クロップ</div>
                    <p className="text-[11px] text-slate-500">
                      `pdf2image` で各ページを画像化。四隅15%領域をOpenCV切り出し。
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-100 space-y-1">
                    <span className="text-[10px] font-bold text-emerald-600 font-mono">STEP 3</span>
                    <div className="font-bold text-slate-800">3. 形状識別解析</div>
                    <p className="text-[11px] text-slate-500">
                      輪郭の円形度 (4 × π × 面積 / 周長²) と充填率 (面積 / 幅×高さ) を計算し●/■を判別。
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-purple-50/70 border border-purple-100 space-y-1">
                    <span className="text-[10px] font-bold text-purple-600 font-mono">STEP 4</span>
                    <div className="font-bold text-slate-800">4. コピー保存・ログ記録</div>
                    <p className="text-[11px] text-slate-500">
                      ●4個は「注文書」、■4個は「在庫確認」へコピー保存。元データ保持。
                    </p>
                  </div>
                </div>
              </div>

              {/* Mark Detection Math Standard */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                    1. 注文書 判定条件 (■ 黒四角 2箇所以上)
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px]">
                    <li>四隅領域（TL, TR, BL, BR）のうち2箇所以上に■が存在すること</li>
                    <li>FAX送信の向き（回転・逆さ）に関わらず確実に自動判別</li>
                    <li>矩形充填度 Extent = 面積 / (幅 × 高さ) ≥ 0.70（正方形）</li>
                    <li>外接矩形のアスペクト比 ≥ 0.60</li>
                  </ul>
                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    2. 在庫確認書類 判定条件 (● 黒丸 2箇所以上)
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px]">
                    <li>四隅領域（TL, TR, BL, BR）のうち2箇所以上に●が存在すること</li>
                    <li>真円度 Circularity = (4 × π × 面積) / 周長² ≥ 0.70</li>
                    <li>外接矩形のアスペクト比 ≥ 0.60（縦横が概ね均等）</li>
                    <li>対象外FAX（どちらのマークも揃わない）はスルー</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'install' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h4 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-indigo-600" />
                  <span>Python環境と必要ライブラリのインストール手順 ( Beginner Manual )</span>
                </h4>

                <div className="space-y-3">
                  <div className="font-bold text-slate-800">【手順 1】 Python のインストール</div>
                  <p className="text-slate-600">
                    Python 3.10 以上がパソコンにインストールされていない場合は、
                    <a
                      href="https://www.python.org/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 underline font-semibold ml-1"
                    >
                      Python公式サイト
                    </a>
                    よりインストーラをダウンロードしてください。(※「Add Python to PATH」にチェックを入れてインストール)
                  </p>
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="font-bold text-slate-800">
                    【手順 2】 必要ライブラリのワンクリックコマンド実行
                  </div>
                  <p className="text-slate-600">
                    コマンドプロンプト（Windows）またはターミナル（Mac）を開き、以下のコマンドを貼り付けて実行します。
                  </p>

                  <div className="p-3 bg-slate-900 text-cyan-300 rounded-lg font-mono text-xs flex justify-between items-center">
                    <code>pip install opencv-python pdf2image Pillow watchdog customtkinter</code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('pip install opencv-python pdf2image Pillow watchdog customtkinter');
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px]"
                    >
                      コピー
                    </button>
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="font-bold text-slate-800">
                    【手順 3】 Poppler (PDF画像レンダリングエンジン) の設定
                  </div>
                  <p className="text-slate-600">
                    `pdf2image` ライブラリはバックグラウンドで `poppler` を使用します。
                    Windowsの場合は Poppler binary (`pdftoppm.exe`) をダウンロードしてPATHに通すか、プログラムフォルダと同階層へ配置してください。
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center space-x-1.5">
                  <FileCode className="w-4 h-4 text-cyan-600" />
                  <span>完成コード (`fax_auto_sorter_gui.py`)</span>
                </span>

                <div className="flex space-x-2">
                  <button
                    onClick={copyCodeToClipboard}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center space-x-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'コピーしました！' : 'コードをコピー'}</span>
                  </button>

                  <button
                    onClick={downloadPythonScript}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center space-x-1 border border-slate-700 shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-300" />
                    <span>`fax_auto_sorter_gui.py` をダウンロード</span>
                  </button>
                </div>
              </div>

              {/* Code Display Window */}
              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
                <pre className="p-4 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-[400px] leading-relaxed">
                  {pythonScriptCode}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium">
            💡 このコードはPython環境へコピー＆ペーストするだけで即座に実行可能です。
          </div>
          <div className="flex space-x-3">
            <button
              onClick={downloadPythonScript}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-lg text-xs transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4 text-white" />
              <span>PythonファイルをPCへダウンロード</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg text-xs transition-all"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
