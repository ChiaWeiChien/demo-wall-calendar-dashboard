# wall-calendar-dashboard

A wall-mounted, iPad-friendly web dashboard that shows:
- Date / time
- Lunar calendar info (Yi / Ji, lunar date, solar term)
- Today's weather (condition, temperature, daily high/low, rain probability, humidity)

## Demo
Open via GitHub Pages:
- https://<YOUR_GITHUB_USERNAME>.github.io/wall-calendar-dashboard/

## Features (MVP)
- Large typography for wall viewing (landscape)
- Auto-refresh clock (every second)
- Auto-refresh data (every 10 minutes)
- Offline indicator (navigator.onLine)

## Roadmap
- [ ] Weather API integration
- [ ] Lunar calendar API integration
- [ ] Location configuration (fixed location recommended for wall display)
- [ ] Better icons / theme options
- [ ] “Add to Home Screen” kiosk-like usage guide

## Development
### Local preview
Run a local server to avoid `file://` limitations:

```bash
python -m http.server 8080
```

### Then open:

- http://localhost:8080

## iPad preview (same Wi-Fi)

### Open in iPad Safari:

- http://<YOUR_LAN_IP>:8080

## License

MIT
