# FAX OCR Corner Mark Analysis Tool (FAX OCR コーナーマーク解析ツール)

ブラウザ上で動作する FAX OCR コーナーマーク (黒丸・黒四角) 解析・位置判定 Web アプリケーションです。

## 特長 (Features)
- **ブラウザ完結**: アップロードされた FAX 画像・PDF はサーバーに送信されず、ブラウザの Web Workers 及び Canvas API で安全に解析されます。
- **高精度検出**: ノイズ除去、適応的二値化、輪郭抽出アルゴリズムにより、FAX 特有の掠れや黒潰れがあるマーク（●・■）でも高い精度で検出・タイプ判定を行います。
- **サンプルデータ生成機能**: 注文書・在庫確認書・見積書等のサンプル PDF をワンクリックで生成し、すぐに動作確認を行えます。

---

## 開発・ビルド手順 (Setup & Build)

### 必須要件 (Prerequisites)
- Node.js (v18 以上推奨)
- npm (v9 以上) または yarn / pnpm / bun

### 1. 依存関係のインストール (Install Dependencies)
```bash
npm install
```

### 2. 開発サーバーの起動 (Run Development Server)
```bash
npm run dev
```
ブラウザで [http://localhost:3000](http://localhost:3000) (またはターミナルに表示された URL) にアクセスします。

### 3. TypeScript チェック (Type Check)
```bash
npm run lint
```

### 4. 本番ビルド (Build for Production)
```bash
npm run build
```
ビルド成果物は `dist/` ディレクトリに出力されます。

### 5. ビルド結果のプレビュー (Preview Build)
```bash
npm run preview
```

---

## GitHub Pages へのデプロイ手順 (Deploy to GitHub Pages)

### GitHub Pages へのデプロイ設定手順 (GitHub Actions)

1. リポジトリの **Settings** > **Pages** に移動します。
2. **Build and deployment** の **Source** を **`GitHub Actions`** に設定します。（デフォルトの「Deploy from a branch」のままだとエラーになる場合があります）
3. `main` ブランチにコードを Push すると、`.github/workflows/deploy.yml` により自動的にビルドおよびデプロイが行われます。

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: ["main"]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

---

## ライセンス (License)
MIT License
