# Wall Calendar & Weather Dashboard（iPad 壁掛日曆）

一個為 **舊款 iPad（Safari）** 設計的輕量化「壁掛日曆＋天氣顯示」網頁應用。  
專注於 **長時間穩定顯示（24/7）**、**台灣在地化**，並刻意避開 Safari 常見的快取與定位問題。

---

## 功能特色（Features）

### 📅 日曆（Calendar）
- 每日行事曆顯示
- 農曆支援
- 宜忌（YiJi / 宜忌）資料（來自本地 JSON）
- 繁體中文 / 英文介面

### 🌤 天氣（Weather）
- 即時天氣與溫度
- 未來 6 小時溫度趨勢
- 天氣資料來源：Open-Meteo
- **直接使用經緯度（lat / lon）**，不依賴模糊地名查詢

### 📍 台灣地區定位（Local-first）
- 使用本地對照表 `data/tw_locations.json`
- 支援輸入：
  - `台北市信義區`
  - `信義區`
  - `Xinyi District, Taipei`
- 中英文皆可本地查表，不依賴遠端 geocoding
- 避免台灣地名在國際 API 上查詢不穩定的問題

### 📴 穩定性與快取設計
- 使用 localStorage 快取：
  - 使用者位置
  - 地名查詢結果
  - 天氣資料
- 網路不穩定時仍可正常顯示
- 設計目標：**長時間無人值守顯示**

---

## 使用方式（How to Use）

本專案為 **純靜態網頁應用**，無後端、無建置流程。  
只要使用瀏覽器開啟 `index.html`，或部署至任意靜態網站即可使用。

特別適合：
- 舊款 iPad 壁掛顯示
- 書籤（Bookmark）快速設定
- 遠端維護與除錯

---

### 基本使用方式

直接開啟：
```
index.html
```

系統將會：
1. 載入 `config.js` 中定義的預設位置
2. 使用經緯度取得天氣資料
3. 將結果快取於瀏覽器中以提高穩定性

---

### URL 參數設定

本系統支援 **URL Query Parameters**，可在不操作裝置的情況下完成設定。

這在壁掛 iPad、遠端維護或除錯時特別實用。

---

#### `lang` – 介面語言

設定顯示語言：
```
?lang=zh
?lang=en
```

範例：
```
index.html?lang=zh 
index.html?lang=en
```

---

#### `loc` – 地點設定（台灣最佳化）

以地名設定顯示位置。

支援格式：
- 中文完整名稱：`台北市信義區`
- 僅行政區：`信義區`
- 英文：`Xinyi District, Taipei`

範例：
```
index.html?loc=台北市信義區
index.html?loc=信義區
index.html?loc=Xinyi%20District,%20Taipei
```

> 系統會優先使用本地對照表 `data/tw_locations.json`  
> 僅在查不到時才使用遠端地理查詢服務。

---

#### 組合參數使用

可同時設定多個參數：
```
index.html?lang=en&loc=Xinyi%20District,%20Taipei
```

非常適合儲存為書籤或遠端設定壁掛裝置。

---

### 快取行為說明

- 地點、地名解析結果、天氣資料皆會儲存在 `localStorage`
- 重新整理頁面時會優先使用快取資料
- 可降低網路不穩定時的影響，提升長時間顯示穩定性


---


## 隱藏維護功能（Hidden Maintenance Feature）

由於舊版 iPad Safari 快取行為不可靠，系統內建一個「隱藏清除快取」機制。

### 🔧 隱藏快取清除方式
1. 連續點擊頁面底部狀態列 **7 次（約 1 秒內）**
2. 確認清除
3. 系統將：
   - 清除 localStorage / sessionStorage
   - 清除 Cache Storage
   - 取消註冊 Service Worker（若存在）
   - 強制重新整理頁面（附帶 cache-busting 參數）

狀態列顯示範例：
```
Location: Xinyi District, Taipei | Wi-Fi: OK | v0.1.1
```

---

## iPad Safari 相容性說明

- 僅在 **底部狀態列** 停用 double-tap 縮放
- 其他區域仍保留正常縮放行為
- 使用技術：
  - `touch-action: manipulation`
  - `dblclick.preventDefault()`

避免誤觸縮放，同時保留隱藏多點擊操作。

---

## 專案結構（Project Structure）

```
.
├─ index.html
├─ style.css
├─ README.md
├─ LICENSE
├─ data/
│  ├─ tw_locations.json     # 台灣縣市 / 行政區經緯度對照表
│  └─ yiji.json             # 宜忌資料
└─ js/
   ├─ app.js                # 應用程式進入點
   ├─ cache.js              # 快取與 localStorage 工具
   ├─ config.js             # 設定與版本資訊
   ├─ dom.js                # DOM 操作工具
   ├─ i18n.js               # 中英文切換
   ├─ location.js           # 位置狀態管理
   ├─ lunar.js              # 農曆計算
   ├─ twLocationLookup.js   # 台灣地名本地查表
   ├─ ui.js                 # UI 渲染
   └─ weather.js            # 天氣資料處理
```

---

## 設定（Configuration）

### 預設位置（Default Location）
`js/config.js`：

```js
export const DEFAULT_LOCATION = {
  zh: "台北市信義區",
  en: "Xinyi District, Taipei",
};
```

### 版本號（App Version）
```js
export const APP_VERSION = "0.1.1";
```

---

## 已知限制（Known Limitations）
- 僅輸入行政區名稱（例如 `中山區`）時可能存在歧義
  - 目前行為：取第一筆匹配結果
  - 可擴充為候選清單 UI
- 專案主要針對台灣地區設計

---

## 部署建議（Deployment）
- 純靜態網站（無後端）
- 可使用 GitHub Pages 或本地伺服器
- 建議使用環境：
  - 舊款 iPad
  - Safari
  - 關閉自動鎖定
  - （選用）Guided Access

---

## 設計理念（Design Philosophy）

本專案刻意避免：
- Browser Geolocation API
- 複雜前端框架
- 不穩定的模糊地名查詢

而選擇：
- 本地資料
- 可預期行為
- 易除錯、易維護的結構
- 適合長時間顯示的設計

---

## License

MIT

---

## Motivation

> 舊 iPad 非常適合當壁掛顯示器，  
> **前提是你不要跟 Safari 的行為對抗，而是順著它設計。**
