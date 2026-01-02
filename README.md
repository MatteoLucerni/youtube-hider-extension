# Youtube Hider

Youtube Hider is a lightweight MV3 Chrome extension that hides already watched videos, filters low views amount videos and removes Shorts from Youtube, with custom settings.

Extension title: "Hide Youtube watched videos, Shorts and low views"
Get it on the Chrome Web Store: https://chromewebstore.google.com/detail/ebpikpmmnpjmlcpanakfcgchkdjaanmm?utm_source=item-share-cb

Or check the website: https://youtubehider.com/

## Features

**YouTube “Hide Watched”**

- Hide videos you’ve already watched in Homepage, Channel pages, Subscriptions feed, Correlated videos and Search results.
- Customizable threshold (0–100%) for marking a video as watched.
- Separate toggles to choose where to hide watched videos or not.

**YouTube “Hide low views amount”**

- Hide videos that have an amount of vies under you chosen threshold in Homepage, Channel pages, Subscriptions feed, Correlated videos and Search results.
- Customizable threshold (0-100k vies).
- Separate toggles to choose where to hide watched videos or not.

**YouTube “Remove Shorts”**

- Completely remove Shorts from Youtube, no distractions

**Netflix & Prime “Auto-Skip”**

- Automatically detects and clicks “Skip Intro”, “Skip Recap” and similar buttons.
- Configurable delay (0–10 seconds) before executing the skip action.
- Toggle to enable or disable auto-skip as needed.

**Badge Indicator**

- Displays a badge on the extension icon to reflect the current state:

  - **A**: All features enabled
  - **S**: Skip only
  - **H**: Hide only
  - **D**: Disabled

## Installation for users

Download it from the Chrome Web Store: https://chromewebstore.google.com/detail/ebpikpmmnpjmlcpanakfcgchkdjaanmm?utm_source=item-share-cb

## Installation for dev

1. Clone or download the repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select the extension’s root folder.
5. (Optional) Pin the Skipper icon to your toolbar.

TIP: to filter only extension's logs on chrome console use: `url:chrome-extension://EXTENSION-ID`

Thanks!

## Project Tree

```
chrome-auto-skip-intro
├─ assets
│  ├─ css
│  │  └─ popup.css
│  └─ icons
│     ├─ youtube-hider-logo.png
│     ├─ YT Hider icon v6 padding 128 128.png
│     ├─ YT Hider icon v6 padding.png
│     └─ YT Hider icon v6.png
├─ background.js
├─ CHANGELOG.md
├─ content.js
├─ env.js
├─ manifest.json
├─ popup.html
├─ popup.js
├─ README.md
└─ utils.js

```
