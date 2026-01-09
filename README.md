# Wall Calendar & Weather Dashboard（iPad 壁掛日曆）

👉 English version: [README.en.md](README.en.md)


一個專為 **舊款 iPad（Safari）** 設計的輕量化壁掛式日曆與天氣顯示網頁應用，  
專注於 **24 小時全天候長時間穩定顯示**，  
並實際解決 iOS Safari 在快取、定位與畫面更新上的不穩定行為。

本專案為 **純靜態前端**，無後端、無建置流程，適合直接部署或以書籤方式使用。

可透過 GitHub Pages 直接部署並作為壁掛顯示使用。

---

## ✨ 功能特色（Features）

### 📅 日曆（Calendar）
- 公曆日期顯示
- 農曆日期與節氣
- 宜 / 忌（YiJi）顯示（本地 JSON）
- 繁體中文 / 英文介面切換

### 🌤 天氣（Weather）
- 即時天氣狀態
- 今日溫度範圍
- 體感溫度、濕度、降雨機率
- 未來數小時溫度趨勢（Sparkline）
- 天氣資料來源：Open-Meteo

### 📍 台灣地區定位（Local-first）
- 使用本地對照表 `data/tw_locations.json`
- 支援輸入：
  - `台北市信義區`
  - `信義區`
  - `Xinyi District, Taipei`
- 中英文皆可直接本地查表
- 僅在必要時才使用遠端地理查詢 API

### 📴 穩定性與快取設計
- 使用 `localStorage` 快取：
  - 使用者地點
  - 地名解析結果
  - 天氣資料
- 網路暫時中斷仍可顯示最近資料
- 適合長時間無人值守顯示（壁掛情境）

---

## 🚀 使用方式（How to Use）

本專案為 **純靜態網頁應用**，無需後端或建置工具。

### 基本使用

直接以瀏覽器開啟：

```
index.html
```

系統將會：
1. 套用預設語言與地點
2. 使用經緯度取得天氣資料
3. 將資料快取於瀏覽器中

---

## 🔗 URL 參數設定（Query Parameters）

可透過 URL 參數在不操作裝置的情況下完成設定，  
非常適合壁掛 iPad、遠端維護或書籤使用。

### `lang` – 介面語言

```
?lang=zh
?lang=en
```

### `loc` – 地點設定（台灣最佳化）

支援格式：
- `台北市信義區`
- `信義區`
- `Xinyi District, Taipei`

```
?loc=台北市信義區
?loc=Xinyi%20District,%20Taipei
```

### 組合使用

```
?lang=en&loc=Xinyi%20District,%20Taipei
```

---

## 🌐 線上展示 / GitHub Pages 部署方式

本專案可直接部署為 **純靜態網站**，  
建議使用 **GitHub Pages** 作為壁掛顯示的實際執行環境。

此方式 **無需建置流程、無需後端伺服器**，  
非常適合舊款 iPad 長時間、全天候顯示使用。

---

### 啟用 GitHub Pages

1. 將此專案推送至 GitHub
2. 前往 **Repository → Settings → Pages**
3. 在 **Source** 設定中：
   - 選擇 `Deploy from a branch`
   - Branch：`main`
   - Folder：`/ (root)`
4. 儲存設定

稍後 GitHub 將提供一個公開網址，例如：

```text
https://<username>.github.io/<repository-name>/
```

---

### 在 iPad 上使用（建議方式）

於 iPad（Safari）中：

1. 開啟 GitHub Pages 提供的網址
2. 視需要透過 URL 參數設定語言與地點
3. （選用）加入「主畫面」
4. 建議系統設定：
   - 自動鎖定：**永不**
   - （選用）開啟「引導使用模式（Guided Access）」

此設定特別適合 **壁掛顯示、長時間無人值守** 的使用情境。

---

### 搭配 URL 參數使用

GitHub Pages 部署後，  
可直接透過修改 URL 來遠端調整顯示內容。

範例：

```
https://<username>.github.io/<repo>/?lang=zh&loc=台北市信義區
https://<username>.github.io/<repo>/?lang=en&loc=Xinyi%20District,%20Taipei
```

此方式可用於：
- 不接觸裝置即可變更顯示設定
- 替換壁掛顯示地點
- 將最終設定結果儲存為書籤

---

### GitHub Pages 的快取行為說明

- GitHub Pages 僅提供靜態檔案
- 所有應用資料（天氣、地點、地名解析）皆由瀏覽器端快取
- 若舊版 iPad Safari 出現異常快取行為：
  - 可使用系統內建的 **隱藏快取清除手勢**
  - （頁面底部狀態列連續點擊 7 次）

---

### 本機與區域網路測試說明（選用）

本專案為純前端網頁應用，**必須透過 HTTP / HTTPS 存取**，  
不支援以 `file://` 方式直接開啟。

---

#### 🖥 本機測試（Localhost）

在開發或除錯時，可於專案目錄中啟動簡易 HTTP 伺服器：

```text
python -m http.server 8000
```

並透過以下網址存取：

```text
http://localhost:8000
```

> ⚠️ 注意  
> 本機測試僅建議用於開發與除錯用途。  
> **iOS Safari 在 `localhost` 環境下的快取、背景刷新與自動播放行為，  
> 可能與正式部署時略有差異。**

---

#### 🌐 區域網路測試（LAN / Same Wi-Fi）

若希望在 **同一個區域網路（例如同一個 Wi-Fi）** 下，  
使用其他裝置（如 iPad）進行測試，可透過主機的區域網路 IP 存取：

1. 確認電腦與 iPad 連線至同一個網路
2. 在電腦上取得電腦的本機 IP（例如 `192.168.1.100`）
3. 使用以下格式在 iPad Safari 中開啟：

```text
http://192.168.1.100:8000
```

> ⚠️ 注意  
> 區域網路測試仍屬於測試環境。  
> **在未使用正式網域與 HTTPS 的情況下，  
> iOS Safari 的行為可能與 GitHub Pages 或正式部署環境不同。**


---

#### 🌍 正式部署建議

實際長時間使用時，建議透過 **GitHub Pages 或自訂網域** 存取本專案：

- 不需額外後端設定
- 瀏覽器行為與正式環境一致
- 可避免 Safari 在測試環境下的非預期限制

> 💡 提示  
> **正式網域能提供更穩定、可預期的 iOS Safari 行為**，  
> 適合用於長時間壁掛顯示。


---

## 🔌 外部 API 使用說明（External APIs）

本專案所有外部資料皆由瀏覽器直接透過 HTTPS 取得，  
**不經過任何後端伺服器**。

### 🌤 天氣資料（Open-Meteo）

API Endpoint：

```text
https://api.open-meteo.com/v1/forecast
```

- 使用經緯度查詢
- 時區採用 `timezone=Asia/Taipei`
- 快取更新頻率：每 2 小時（可由 [js/config.js](./js/config.js) 中修改）

> 詳細 API 說明請參考 **[Open-Meteo API 文件](https://open-meteo.com/en/docs)**

### 🗺 地理位置查詢（Fallback）

API Endpoint：

```text
https://geocoding-api.open-meteo.com/v1/search
```

- 僅在本地查表失敗時使用
- 設定查詢結果快取 7 天
- 地區碼參數固定用 `countryCode=TW`

> 詳細 API 說明請參考 **[Open-Meteo Geocoding API 文件](https://open-meteo.com/en/docs/geocoding-api)**

### 📅 農民曆資訊（PowerLife 萬年曆 API）

API Endpoint：

```text
https://api.doctorfate.net/query
```

- 由瀏覽器直接以 HTTPS 發送請求（GET）
- 需要在 Header 帶入 API Key：`X-API-Key: PowerLife-APP-2025-v1`
- 使用西元年月日（ year / month / day）查詢指定日期的農民曆資料
- 快取策略：每日快取（跨日才更新一次），避免每次刷新都打 API
- 宜/忌詞彙會透過本地 data/yiji.json 查表，輸出支援中/英文顯示（含簡繁 aliases 相容）

> 詳細 API 說明請參考 **[PowerLife 萬年曆 API 文件](https://api.doctorfate.net)**

---

## 🧠 設計理念（Design Philosophy）

本專案刻意避免：

- Browser Geolocation API
- 複雜前端框架
- 不可預期的模糊地名查詢
- 需要 API Key 的第三方服務

而選擇：

- 本地資料（Local-first）
- 可預期、可除錯的行為
- 適合長時間顯示的 UI 與快取策略
- 對舊款 iPad Safari 友善的實作方式

---

## 🧰 隱藏維護功能（Hidden Maintenance）

由於舊版 iPad Safari 的快取行為不穩定，  
系統內建一個隱藏的快取清除機制。

### 快取清除方式
1. 連續點擊頁面底部狀態列 **7 次**
2. 確認後系統將：
   - 清除 localStorage / sessionStorage
   - 清除 Cache Storage
   - 取消註冊 Service Worker（若存在）
   - 重新載入頁面（附加 cache-busting 參數）

---

## 📁 專案結構（Project Structure）

本專案採用 **模組化前端結構**，並將 CSS 拆分為多個層級檔案，以提升可維護性與跨裝置穩定性。

```
.
├─ index.html
├─ README.md
├─ README.en.md
├─ LICENSE
├─ .gitattributes
├─ .gitignore
│
├─ data/
│  ├─ tw_locations.json     # 台灣縣市 / 行政區經緯度對照表（Local-first）
│  └─ yiji.json             # 宜忌（YiJi）資料
│
├─ js/
│  ├─ app.js                # 應用程式進入點（排程、生命週期、模組協調）
│  ├─ cache.js              # 快取策略與 localStorage 工具
│  ├─ config.js             # 全域設定（版本、時區、更新頻率）
│  ├─ dom.js                # DOM 存取輔助工具
│  ├─ i18n.js               # 中 / 英文切換與字典
│  ├─ location.js           # 地點解析與狀態管理
│  ├─ logger.js             # 統一 logging 介面（debug / info / warn）
│  ├─ lunar.js              # 農曆、節氣、宜忌資料處理
│  ├─ twLocationLookup.js   # 台灣行政區本地查表
│  ├─ ui.js                 # UI 更新與渲染邏輯
│  └─ weather.js            # 天氣資料取得、快取與顯示
│
└─ style/
   ├─ 00-base.css           # Reset、Theme tokens、共用基礎樣式
   ├─ 10-layout.css         # 主要版面配置（Grid / Flex）
   ├─ 20-responsive.css     # 裝置 / 方向（直橫式）調整
   └─ 30-patches.css        # 瀏覽器相容性修補（舊 iPad / Safari）
```

---

### 🎨 CSS 分層設計說明（CSS Architecture）

CSS 採用 **分層（Layered）結構**，避免單一巨大樣式檔難以維護：

- **00-base.css**
  - Reset / Normalize
  - CSS Variables（顏色、字體、間距）
  - 全域共用樣式

- **10-layout.css**
  - 主要 Grid / Flex 版面
  - Panel / Card 結構
  - 平板橫式的預設配置

- **20-responsive.css**
  - 平板 / 手機
  - 直式 / 橫式切換
  - 高度不足時的 UI 縮減策略

- **30-patches.css**
  - iOS Safari 特有行為修正
  - flex / grid overflow 問題
  - 視窗高度（vh / dvh / svh）差異處理

此結構特別針對 **舊款 iPad Safari** 與長時間顯示情境設計，  
確保在不同裝置與瀏覽器下仍能穩定呈現。

---

## 📜 License

MIT License. 詳細請參考 [LICENSE](./LICENSE)。

---

## Motivation

> 本專案旨在探索如何將舊款 iPad 重新利用為長時間穩定顯示的壁掛裝置，  
> 並在設計上充分考量與遵循 iOS Safari 的行為與限制。
