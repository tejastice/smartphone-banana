# 🍌 Smartphone Banana

AI画像生成PWAアプリ - fal-ai/nano-banana-proを使用したテキストから画像を生成するウェブアプリケーション

## 特徴

- 📱 PWA (Progressive Web App) - スマートフォンにインストール可能
- 🎨 AI画像生成 - テキストプロンプトから高品質な画像を生成
- ⚡ オフライン対応 - Service Workerによるキャッシュ機能
- 🌙 ダークモード対応
- 📐 複数のアスペクト比・解像度に対応
- 💾 ローカルストレージでAPIキーを保存

## 使い方

### 1. APIキーの取得

[fal.ai](https://fal.ai/)でアカウントを作成し、APIキーを取得してください。

### 2. アプリの起動

#### ローカルでの実行

```bash
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000` を開きます。

#### GitHub Pagesでの公開

1. このリポジトリをGitHubにプッシュ
2. Settings > Pages > Source で `main` ブランチのルートフォルダを選択
3. 公開されたURLにアクセス

### 3. 画像の生成

1. 取得したAPIキーを入力
2. プロンプト（生成したい画像の説明）を入力
3. 設定を調整（画像数、アスペクト比、解像度、フォーマット）
4. 「画像を生成」ボタンをクリック

## 設定オプション

- **画像数**: 1-4枚の画像を同時生成
- **アスペクト比**: 1:1, 16:9, 9:16, 4:3, 3:4, など
- **解像度**: 1K, 2K, 4K
- **フォーマット**: PNG, JPEG, WebP

## 技術スタック

- HTML5
- CSS3 (グラデーション、グリッドレイアウト、レスポンシブデザイン)
- JavaScript (ES6+)
- Service Worker (PWA)
- fal.ai API (nano-banana-pro)

## セキュリティについて

⚠️ **重要**: APIキーはブラウザのlocalStorageに平文で保存されます。暗号化はされていません。

- 他人と共有する端末では使用しないでください
- より安全な運用には、バックエンドサーバーでAPIキーを管理することを推奨します

## ファイル構成

```
├── index.html          # メインHTML
├── style.css           # スタイルシート
├── app.js              # メインJavaScript
├── sw.js               # Service Worker
├── manifest.json       # PWAマニフェスト
├── README.md           # このファイル
├── .gitignore          # Git除外設定
└── icons/              # アプリアイコン
    ├── icon-192.png
    ├── icon-512.png
    ├── create-icons.html
    └── README.md
```

## ライセンス

MIT License

## 作成者

作成: 2025

Powered by [fal-ai/nano-banana-pro](https://fal.ai/models/fal-ai/nano-banana-pro)
