<p align="center">
  <img src="assets/icons/youtube-hider-logo.png" alt="Youtube Hider Logo" width="80" />
</p>

<h1 align="center">Youtube Hider</h1>

<p align="center">
  <strong>Hide watched videos, Shorts and low-view videos from YouTube, plus auto-skip intros on Netflix and Prime Video.</strong>
</p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/ebpikpmmnpjmlcpanakfcgchkdjaanmm"><img src="https://img.shields.io/chrome-web-store/v/ebpikpmmnpjmlcpanakfcgchkdjaanmm?style=flat&logo=googlechrome&logoColor=white&label=Chrome%20Web%20Store" alt="Chrome Web Store Version" /></a>
  <a href="https://chromewebstore.google.com/detail/ebpikpmmnpjmlcpanakfcgchkdjaanmm"><img src="https://img.shields.io/chrome-web-store/users/ebpikpmmnpjmlcpanakfcgchkdjaanmm?style=flat&logo=googlechrome&logoColor=white&label=Users" alt="Chrome Web Store Users" /></a>
  <a href="https://chromewebstore.google.com/detail/ebpikpmmnpjmlcpanakfcgchkdjaanmm"><img src="https://img.shields.io/chrome-web-store/rating/ebpikpmmnpjmlcpanakfcgchkdjaanmm?style=flat&logo=googlechrome&logoColor=white&label=Rating" alt="Chrome Web Store Rating" /></a>
  <img src="https://img.shields.io/badge/manifest-v3-green?style=flat" alt="Manifest V3" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-yellow?style=flat" alt="MIT License" /></a>
</p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/ebpikpmmnpjmlcpanakfcgchkdjaanmm?utm_source=item-share-cb">Chrome Web Store</a> &middot;
  <a href="https://youtubehider.com/">Website</a> &middot;
  <a href="https://forms.gle/oAqtSjQHQeEp9TFKA">Request a Feature</a> &middot;
  <a href="https://forms.gle/oAqtSjQHQeEp9TFKA">Report a Bug</a>
</p>

---

## Features

### Hide Watched Videos

Hide videos you've already watched from Home, Channel pages, Subscriptions, Search results and Related videos. Set a custom threshold (0-100%) to define how much you need to have watched before a video is hidden.

### Minimum Views Filter

Hide videos below a certain view count. Choose from a range of thresholds (0 to 10M views) to filter out low-engagement content. Per-page toggles give you full control.

### Hide Shorts

Completely remove YouTube Shorts from your feed, search results, navigation tabs and sidebar. Enjoy a Shorts-free YouTube experience.

### Auto-Skip Intros (Netflix & Prime Video)

Automatically detects and clicks "Skip Intro", "Skip Recap" and similar buttons on Netflix and Prime Video. Configurable delay (0-5 seconds) before executing the skip.

### Floating Quick-Settings Button

A draggable floating button on YouTube pages gives you instant access to toggle settings without opening the extension popup. Drag it to any edge of the screen and it snaps to the nearest viewport border, remembering its position. Automatically hidden on video watch pages for a clean viewing experience.

### Easy Mode & Advanced Mode

**Easy Mode** provides simple master toggles for each feature. Switch to **Advanced Mode** for per-page granular control over every setting.

### Badge Indicator

The extension icon shows a badge reflecting the current state:

- **A** - All features enabled
- **S** - Skip only
- **H** - Hide only
- **OFF** - All disabled

---

## Installation

### For Users

Install directly from the **[Chrome Web Store](https://chromewebstore.google.com/detail/ebpikpmmnpjmlcpanakfcgchkdjaanmm?utm_source=item-share-cb)**.

### For Developers

1. Clone the repository
   ```bash
   git clone https://github.com/your-username/youtube-hider-extension.git
   ```
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (top-right corner)
4. Click **Load unpacked** and select the extension's root folder
5. (Optional) Pin the extension icon to your toolbar

> **Tip:** To filter only this extension's logs in Chrome DevTools console, use:
> `url:chrome-extension://EXTENSION_ID`

---

## Build

Package the extension for Chrome Web Store upload:

```powershell
.\build.ps1
```

This creates a zip file in `dist/` containing only the files needed by the extension. The script automatically reads `manifest.json` and parses `popup.html` to collect all referenced files.

---

## Project Structure

```
youtube-hider-extension
├── assets/
│   ├── css/
│   │   └── popup.css
│   └── icons/
│       ├── youtube-hider-logo.png
│       ├── YT Hider icon v6.png
│       ├── YT Hider icon v6 padding.png
│       └── YT Hider icon v6 padding 128 128.png
├── background.js          Service worker (badge, lifecycle, messaging)
├── build.ps1              Build/packaging script
├── CHANGELOG.md           Version history
├── content.js             Core content script (hiding, floating button, toasts)
├── env.js                 DEV_MODE flag
├── LICENSE                MIT License
├── manifest.json          Extension manifest (MV3)
├── popup.html             Settings popup UI
├── popup.js               Popup logic and storage sync
├── README.md
└── utils.js               Shared utilities (debounce, logger)
```

---

## How It Works

1. **Content scripts** (`env.js`, `utils.js`, `content.js`) load on YouTube, Netflix and Prime Video pages.
2. A **MutationObserver** watches for DOM changes and triggers hiding/filtering logic based on your preferences.
3. Settings are stored in `chrome.storage.sync` (synced across devices). The floating button position is stored in `chrome.storage.local` (device-specific).
4. The **floating button** uses a closed Shadow DOM to encapsulate its styles from the host page.
5. The **background service worker** manages badge updates, extension lifecycle events and messaging between popup/content scripts.

---

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## License

This project is licensed under the [MIT License](LICENSE).
