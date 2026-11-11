# 開發與 GitHub Pages 部署說明

這份文件供儲存庫維護者使用。一般讀者可返回 [首頁 README](../README.md)。

## 本機開發

安裝 Node.js 20 以上版本，在專案根目錄執行：

```bash
npm install
npm run dev
```

正式編譯與預覽：

```bash
npm run build
npm run preview
```

## GitHub Pages 部署

儲存庫：`suyanali/EPUB-TXT-Converter`

1. 將所有專案檔案推送至 `main`（包含 `.github/workflows/deploy.yml`）。
2. 開啟 GitHub 儲存庫 → **Settings → Pages**。
3. 在 **Build and deployment → Source** 選擇 **GitHub Actions**。
4. 查看 **Actions → Deploy GitHub Pages**；部署成功後網站網址為：
   <https://suyanali.github.io/EPUB-TXT-Converter/>

工作流程會將 Vite 的 `BASE_PATH` 設成 `/${repository_name}/`。使用自訂網域或根站時需調整此設定。

## 版本與 PWA 更新

- 在 `package.json` 修改 `version`，例如 `1.0.0` → `1.0.1`，再推送至 `main`。
- 畫面版本號會跟著更新。
- Service Worker 於開啟、切回頁面、每小時和手動按「檢查更新」時嘗試檢查更新。
- 有新版時出現更新提示；使用者按「立即更新」後會重新載入。
- 首次載入並完成快取後才能離線使用；開發模式 `npm run dev` 不代表完整離線體驗，應在正式部署環境驗證。

## 技術與注意事項

- Vite + JavaScript + JSZip + OpenCC + vite-plugin-pwa。
- 以 `META-INF/container.xml` 找出 OPF，再依 OPF spine 順序擷取 XHTML 文字。
- TXT 輸出 UTF-8；多本可合併 ZIP 下載。
- 不支援 DRM 破解、掃描圖片 OCR、完整復原複雜 EPUB 排版。
- 大量或大尺寸 EPUB 可能受瀏覽器記憶體限制。
- 目前尚未於完整的 GitHub Pages 正式環境完成功能驗收，部署後應以實際 EPUB 測試。
