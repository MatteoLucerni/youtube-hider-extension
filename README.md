<p align="center">
  <img src="assets/icons/youtube-hider-logo.png" alt="Youtube Hider Logo" width="80" />
</p>

<h1 align="center">Youtube Hider</h1>

<p align="center">
  <strong>Hide or dim watched videos, Shorts, Mixes, Playlists, Lives and low-view videos from YouTube.</strong>
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

### Upload Date Filter

Hide videos by their upload date with two independent sub-filters: **Hide newer than** and **Hide older than**. Each has its own toggle and slider with logarithmic time steps (1 day to 10 years). Use both together to keep only videos in a specific age range - for example, hide recent AI-generated content and outdated videos at the same time. Supports 10+ YouTube interface languages.

### Hide Shorts, Mixes, Playlists & Lives

Selectively remove content types from your YouTube feed with individual toggles:

- **Shorts** - removes the Shorts shelf, navigation tab and Shorts from search results
- **Mixes** - removes YouTube Mix playlists from feed, search results and related sidebar
- **Playlists** - removes playlists from feed, search results and related sidebar
- **Lives** - removes live streams from your feed and search results

### Filter Mode

Choose how filtered content is treated across all active filters:

- **Hide** (default) - filtered elements are removed from view entirely
- **Dim** - filtered elements stay visible under a dark semi-transparent overlay. The overlay displays a compact label indicating why the element was filtered ("Already watched", "Views too low", "Video too new", "Video too old", "Mix playlist", "Playlist", "Live stream"). Filtered elements remain fully clickable. Shorts are always hidden regardless of this setting.

In Hide mode, lockup-based cards are removed at the correct wrapper level to avoid empty placeholders in Home and Subscriptions grids.

Filter updates are live in both directions: increasing thresholds hides more content, and lowering thresholds restores matching content immediately without refreshing the page.

The Filter Mode toggle is available in both the popup and the header settings dropdown, since the dropdown embeds the full popup.

### Channel Whitelist

Exempt specific channels from every active filter - their videos are never hidden or dimmed (Shorts are always filtered regardless of whitelist status). A channel can be whitelisted from three places, and hovering the overlay or inline button shows a tooltip explaining what it does:

- The **"Whitelist" button** on a filtered/dimmed overlay - shows a 3-second undo countdown before the channel is actually exempted, so accidental clicks can be reverted
- The **inline "Whitelist" button** next to the Subscribe button on video and channel pages
- The **Channel Whitelist card** in the popup, which lists every whitelisted channel as a removable chip and lets you add the current tab's channel directly

### Master Extension Switch

Use the **Extension** switch in the popup header to instantly enable or disable the entire extension. When disabled, filtering is paused globally and the badge shows **OFF**.

### Header Settings Button

A small icon-only button lives right in YouTube's own header (desktop only), next to the Create button, giving you instant access to your full settings without opening the extension popup separately. Clicking it opens a dropdown with the exact same settings UI as the popup. It appears on every page, including Watch, since it lives in page chrome rather than floating over the video. On first install, a guided spotlight tutorial walks you through the button and its dropdown - you can restart it anytime from the popup.

### Hide On-Page Controls

For a more discreet setup, enable **Hide on-page controls** in **Extra Settings** to remove all of the extension's on-screen elements from YouTube - the header settings button and the inline and overlay "Whitelist" buttons. Filtering keeps working in the background. While this option is on, the Header Button toggle is greyed out, with a tooltip explaining how to re-enable it.

### Simple Mode & Advanced Mode

The popup starts in **Simple Mode** for quick everyday use. When you need page-level control, open **Extra Settings** and use the **Interface Mode** row to switch to **Advanced Mode**, where per-page toggles are available for each filter.

### Badge Indicator

The extension icon shows a badge reflecting the current state:

- _(no badge)_ - Features enabled
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
│   └── icons/
│       ├── youtube-hider-logo.png
│       └── YT Hider icon v6.png
├── content/
│   ├── page-bridge.js     MAIN-world script: caches video-id-to-channel mappings from YouTube's internal data
│   ├── env.js             DEV_MODE flag
│   ├── utils.js           Shared utilities (debounce, logger, safe storage)
│   ├── state.js           Preferences, timing constants, storage listener
│   ├── warning.js         High-filtering warning and infinite-loop detection
│   ├── header-button.js  Header settings button and its iframe-embedded settings dropdown
│   ├── tutorial.js        Guided spotlight tutorial
│   ├── parsers.js         View count, upload date and channel parsers
│   ├── filters.js         Video hiding/filtering logic, Channel Whitelist overlay button
│   ├── channel-whitelist-button.js  Inline Whitelist button next to Subscribe
│   └── init.js            Page detection, observers, bootstrap
├── popup/
│   ├── popup.html         Settings popup UI
│   ├── data.js            Popup constants and utility functions
│   ├── popup.js           Popup initialization and event handling
│   ├── base.css           Variables, reset, header, layout, simple/advanced states
│   ├── cards.css          Setting cards and slider controls
│   ├── toggles.css        Toggle grid, switches, footer
│   └── filters.css        Tooltips, date filter, overlap warning
├── background.js          Service worker (badge, lifecycle, messaging)
├── build.ps1              Build/packaging script
├── CHANGELOG.md           Version history
├── LICENSE                MIT License
├── manifest.json          Extension manifest (MV3)
└── README.md
```

---

## How It Works

1. **Content scripts** (12 files in `content/`) load on YouTube pages in the order defined by `manifest.json`. They share a global scope via Chrome's isolated world. `page-bridge.js` is the exception: it runs in the page's `MAIN` world at `document_start` to read YouTube's own internal data and expose a video-id-to-channel cache via a DOM attribute, since the isolated world can read the DOM but not the page's JavaScript globals.
2. A **MutationObserver** watches for DOM changes and triggers hiding/filtering logic based on your preferences.
3. Settings are stored in `chrome.storage.sync` (synced across devices), except for the "what's new" flag which is device-specific `chrome.storage.local` state.
4. The **header button** (`content/header-button.js`) uses a closed Shadow DOM to encapsulate its styles from the host page. Its settings dropdown embeds `popup/popup.html` in an `<iframe>`, created fresh on every open, so the dropdown is always the same, unmodified popup UI.
5. The **background service worker** manages badge updates, extension lifecycle events and messaging between popup/content scripts.

---

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## License

This project is licensed under the [MIT License](LICENSE).
