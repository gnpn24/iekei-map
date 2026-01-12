# アイコンディレクトリ
   PWA用アイコンを配置
```
5. **「Commit changes」** をクリック

6. **`icons` フォルダが作成されたら**
7. **`icons` フォルダに入る**
8. **「Add file」→「Upload files」**
9. **8つのアイコンをドラッグ&ドロップ**：
   - icon-29.png
   - icon-40.png
   - icon-76.png
   - icon-120.png
   - icon-152.png
   - icon-167.png
   - icon-180.png
   - icon-1024.png
10. **Commit message** に入力：
```
    add: PWA用アイコン追加
```
11. **「Commit changes」** をクリック

---

### 4️⃣ generate-pwa-icons.html をアップロード

1. **リポジトリのメインページ**に戻る
2. **「Add file」→「Upload files」**
3. **`generate-pwa-icons.html`** をドラッグ&ドロップ
4. **Commit message** に入力：
```
   add: アイコン生成ツール追加
```
5. **「Commit changes」** をクリック

---

## 📋 アップロードするファイル一覧
```
リポジトリルート/
├── index.html (更新)
├── manifest.json (新規)
├── service-worker.js (新規)
├── generate-pwa-icons.html (新規)
└── icons/ (新規フォルダ)
    ├── README.md
    ├── icon-29.png
    ├── icon-40.png
    ├── icon-76.png
    ├── icon-120.png
    ├── icon-152.png
    ├── icon-167.png
    ├── icon-180.png
    └── icon-1024.png
```

---

## 🎯 簡単な順番

### ステップ1: まずアイコン生成
1. ダウンロードした `generate-pwa-icons.html` をブラウザで開く
2. 8つのアイコンが自動ダウンロード

### ステップ2: GitHubにアップロード
1. `manifest.json` をアップロード
2. `service-worker.js` をアップロード
3. `index.html` を更新
4. `icons/` フォルダを作成
5. 8つのアイコンをアップロード
6. `generate-pwa-icons.html` をアップロード

---

## ✅ 確認方法

全てアップロード後：

1. **GitHub Pages設定を確認**
   - Settings → Pages
   - Source: `master` branch
   - Save

2. **数分待つ**

3. **公開URLにアクセス**
```
   https://[ユーザー名].github.io/[リポジトリ名]/
