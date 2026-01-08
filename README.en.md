# Wall Calendar & Weather Dashboard  

A lightweight wall-mounted calendar and weather dashboard optimized for long-running display on iPad Safari and similar tablet devices.

It focuses on **stable 24-hour always-on display**,  
and pragmatically addresses real-world issues of iOS Safari, including caching, geo-location, and viewport refresh behavior.


This project is a **pure static front-end application** — no backend, no build step,  
and no framework dependencies. 

Live demo available via GitHub Pages.


---

## ✨ Features

### 📅 Calendar
- Gregorian date display
- Lunar calendar and solar terms
- Yi / Ji (宜忌) information from local JSON
- Traditional Chinese / English UI

### 🌤 Weather
- Current weather conditions
- Daily temperature range
- Feels-like temperature, humidity, precipitation
- Next-hours temperature trend (sparkline)
- Weather data powered by **Open-Meteo**

### 📍 Taiwan-optimized Location Handling (Local-first)
- Local lookup table: `data/tw_locations.json`
- Supported inputs:
  - `台北市信義區`
  - `信義區`
  - `Xinyi District, Taipei`
- Local lookup works in both Chinese and English
- Remote geocoding is used **only as a fallback**

### 📴 Stability & Caching
- Uses `localStorage` to cache:
  - User location
  - Geocoding results
  - Weather data
- Continues to display data when network is unstable
- Designed for unattended, always-on display

---

## 🚀 Usage

This is a **pure static web application**.

Open directly in a browser:

```
index.html
```

The system will:
1. Apply default language and location
2. Fetch weather data using latitude / longitude
3. Cache results locally for stability

---

## 🔗 URL Parameters

The dashboard can be fully configured via URL parameters,  
which is ideal for wall-mounted iPads and remote maintenance.

### `lang` — UI Language

```
?lang=zh
?lang=en
```

### `loc` — Location (Taiwan-optimized)

Supported formats:
- `台北市信義區`
- `信義區`
- `Xinyi District, Taipei`

```
?loc=台北市信義區
?loc=Xinyi%20District,%20Taipei
```

### Combined example

```
?lang=en&loc=Xinyi%20District,%20Taipei
```

---

## 🌐 Live Demo / GitHub Pages Deployment

This project can be deployed as a **pure static site** using  
**GitHub Pages**, with no build step and no server configuration.

This is the recommended way to run the dashboard on a wall-mounted iPad.

---

### Enable GitHub Pages

1. Push this repository to GitHub
2. Go to **Repository → Settings → Pages**
3. Under **Source**:
   - Select `Deploy from a branch`
   - Choose:
     - Branch: `main`
     - Folder: `/ (root)`
4. Save the settings

After a short delay, GitHub will provide a public URL, for example:

```text
https://<username>.github.io/<repository-name>/
```

---

### Open on iPad (Recommended)

On the iPad (Safari):

1. Open the GitHub Pages URL
2. Set language / location via URL parameters if needed
3. Add the page to **Home Screen** (optional)
4. Enable:
   - Auto-Lock: **Never**
   - (Optional) Guided Access

This setup is ideal for **24/7 wall-mounted display**.

---

### URL Parameters with GitHub Pages

You can configure the dashboard remotely by modifying the URL.

Examples:

```
https://<username>.github.io/<repo>/?lang=zh&loc=台北市信義區
https://<username>.github.io/<repo>/?lang=en&loc=Xinyi%20District,%20Taipei
```

This makes it possible to:
- Change language without touching the device
- Update location remotely
- Store the final URL as a bookmark

---

### Cache Behavior on GitHub Pages

- GitHub Pages serves files as static assets
- Application data (weather, location, geocoding results) is cached via `localStorage`
- If Safari cache behaves unexpectedly on older devices:
  - Use the **hidden cache reset gesture** (7 taps on footer)

---

### Notes on Custom Domains (Optional)

If you use a custom domain:

- HTTPS is required (GitHub Pages provides this automatically)
- No additional configuration is needed
- Safari handles the app identically to `github.io` domains

---

> 💡 Tip  
> GitHub Pages is preferred over local file access (`file://`)  
> because it avoids Safari caching quirks and provides more predictable behavior.

---

## 🔌 External APIs

All external data is fetched **directly from the browser via HTTPS**.  
No backend proxy is used.

### 🌤 Weather Data (Open-Meteo)

API endpoint:

```text
https://api.open-meteo.com/v1/forecast
```

- Latitude / longitude based queries
- Explicit `timezone=Asia/Taipei`
- Cached and refreshed every 2 hours

### 🗺 Geocoding (Fallback only)

API endpoint:

```text
https://geocoding-api.open-meteo.com/v1/search
```

- Used only when local lookup fails
- Cached for 7 days
- Restricted to `countryCode=TW`

---

## 📁 Project Structure

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
│  ├─ tw_locations.json     # Taiwan administrative area → lat/lon
│  └─ yiji.json             # Yi / Ji data
│
├─ js/
│  ├─ app.js                # Application entry & scheduling
│  ├─ cache.js              # Cache & localStorage utilities
│  ├─ config.js             # Global configuration
│  ├─ dom.js                # DOM helpers
│  ├─ i18n.js               # Internationalization
│  ├─ location.js           # Location resolution & state
│  ├─ logger.js             # Centralized logging
│  ├─ lunar.js              # Lunar calendar & Yi/Ji logic
│  ├─ twLocationLookup.js   # Local Taiwan lookup table
│  ├─ ui.js                 # UI rendering
│  └─ weather.js            # Weather fetch & render
│
└─ style/
   ├─ 00-base.css           # Reset, theme tokens, base styles
   ├─ 10-layout.css         # Layout and grid system
   ├─ 20-responsive.css    # Device & orientation handling
   └─ 30-patches.css       # Safari / old iPad fixes
```

---

## 🧠 Design Philosophy

This project intentionally avoids:

- Browser Geolocation API
- Front-end frameworks
- Unpredictable fuzzy location queries
- APIs that require authentication keys

Instead, it focuses on:

- **Local-first data**
- **Predictable behavior**
- **Simple, debuggable architecture**
- **Long-term stability on old Safari**

---

## 🧰 Hidden Maintenance Feature

Due to unreliable cache behavior on older iPad Safari,  
a hidden cache-reset mechanism is included.

### How to trigger
1. Tap the footer status bar **7 times**
2. Confirm the action

The system will:
- Clear localStorage / sessionStorage
- Clear Cache Storage
- Unregister Service Workers (if any)
- Reload the page with cache-busting parameters

---

## 📜 License

MIT

---

## Motivation

> Old iPads make excellent wall displays —  
> **as long as you design *with* Safari, not against it.**
