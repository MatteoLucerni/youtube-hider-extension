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
  <a href="https://forms.gle/oAqtSjQHQeEp9TFKA">Report a Bug</a> &middot;
  <a href="https://ko-fi.com/D5Y424F3EB">Support on Ko-fi</a>
</p>

---

## Features

### Hide Watched Videos

Hide videos you've already watched from Home, Channel pages, Subscriptions, Search results and Related videos. Set a custom threshold (0-100%) to define how much you need to have watched before a video is hidden.

### Mark as Watched

YouTube does not always show a progress bar on a video you already watched, and it never shows one for a video you watched on another account. Hover the video and click **Watched**, next to **Blacklist** at the top of the thumbnail, to hide it the same way. The button runs a 3-second countdown with **Undo** before anything is hidden, and you can move straight on to the next video: every countdown runs on its own.

- Marked videos follow the **Hide Watched Videos** card: they are hidden only where that card is active (slider above 0 and the page's toggle on), and the **Watched** button only appears there
- A marked video stays hidden even when its channel or title is whitelisted, since marking it is a choice about that one video
- In Dim mode the overlay reads **Marked as watched** and carries an **Unmark** button that brings the video back immediately
- The **Marked as watched** row in the Hide Watched Videos card shows how many videos are marked; **Manage** opens the **Marked as watched** tab of the [Manage page](#manage-page), which lists them newest first with thumbnail, title, channel and date
- Up to 3,000 videos are kept. Marking one more drops the video marked longest ago. From 2,700 on, the count turns amber and warns about it
- The list syncs across devices like the channel lists, sharing the same synced storage with them. The channel lists always come first: when both do not fit, syncing of the marked videos pauses, the card shows a "Sync paused" notice, and the list keeps working in this browser. Titles and channels stay on the device where a video was marked; other devices show its thumbnail until they come across the video on YouTube

### Views Filter

Hide videos by their view count with two independent sliders: **Minimum Views** (50 to 10M) hides everything below the threshold, **Maximum Views** (1,000 to 10M) hides everything above it. Use either on its own, or both together to keep only videos inside a popularity range. Both share the card's per-page toggles. If the two ends cross over, the filter switches itself off and says so, rather than hiding everything. Reads YouTube's view counts in every interface language, including the ones that do not write the label in Latin script or place it before the number.

### Upload Date Filter

Hide videos by their upload date with two independent sub-filters: **Hide newer than** and **Hide older than**. Each has its own toggle and slider with logarithmic time steps, from 1 hour to 10 years for **Hide newer than** and from 1 day to 10 years for **Hide older than**. Use both together to keep only videos in a specific age range - for example, hide recent AI-generated content and outdated videos at the same time. If the two thresholds cross over, the filter switches itself off and says so, rather than hiding everything. Reads YouTube's dates in every interface language, including the abbreviated forms the current layout uses ("13 gg fa", "vor 2 Std.", "12 h lalu").

### Hide Shorts, Mixes, Playlists & Lives

Selectively remove content types from your YouTube feed with individual toggles:

- **Shorts** - removes the Shorts shelf, navigation tab and Shorts from search results
- **Mixes** - removes YouTube Mix playlists from feed, search results and related sidebar
- **Playlists** - removes playlists from feed, search results and related sidebar
- **Lives** - removes live streams from your feed and search results

### Filter Mode

Choose how filtered content is treated across all active filters:

- **Hide** (default) - filtered elements are removed from view entirely
- **Dim** - filtered elements stay visible under a dark semi-transparent overlay. The overlay displays a compact label indicating why the element was filtered ("Already watched", "Marked as watched", "Views too low", "Views too high", "Video too new", "Video too old", "Mix playlist", "Playlist", "Live stream", "Blacklisted channel"). Filtered elements remain fully clickable. Shorts are always hidden regardless of this setting.

In Hide mode, lockup-based cards are removed at the correct wrapper level to avoid empty placeholders in Home and Subscriptions grids.

Filter updates are live in both directions: increasing thresholds hides more content, and lowering thresholds restores matching content immediately without refreshing the page.

Filter Mode has its own dedicated card at the top of the popup, since it affects every other filter below it. It's available in both the popup and the header settings dropdown, since the dropdown embeds the full popup.

### Channel Whitelist

Exempt specific channels from every active filter - their videos are never hidden or dimmed (Shorts are always filtered regardless of whitelist status). A channel can be whitelisted from three places, and hovering the overlay or inline button shows a tooltip explaining what it does:

- The **"Whitelist" button** on a filtered/dimmed overlay - shows a 3-second undo countdown before the channel is actually exempted, so accidental clicks can be reverted
- The **inline "Whitelist" button** next to the Subscribe button on video and channel pages
- The **Channel Whitelist card** in the popup, which shows how many channels are listed, adds the current tab's channel directly, and opens the full list on the [Manage page](#manage-page), where channels can also be pasted in bulk

### Channel Blacklist

The opposite of Channel Whitelist: a blacklisted channel's videos are always hidden, everywhere, including Shorts, Mixes, Playlists and Lives, regardless of any other filter's own on/off state. A channel can never be on both lists at once, adding it to one removes it from the other. A channel can be blacklisted from three places, plus the Manage page:

- The **inline "Blacklist" button** next to the inline "Whitelist" button on video and channel pages
- A **hover "Blacklist" pill** that appears at the top of any video card's thumbnail on mouseover, filtered or not, with a 3-second undo countdown before the channel is actually written to the blacklist, so nothing disappears mid-countdown. Over a plain thumbnail the pill uses a solid dark style for readability; over an already-filtered/dimmed card it blends into the overlay instead
- The **Channel Blacklist card** in the popup, which shows how many channels are listed, adds the current tab's channel directly, and opens the full list on the [Manage page](#manage-page), where channels can also be pasted in bulk

A filtered/dimmed overlay never carries its own "Blacklist" button, only "Whitelist" (or, for an already-blacklisted channel, "Unblacklist"); use the hover pill for adding a channel from any card, filtered or not.

Turning the whole Channel Blacklist toggle off removes every on-page Blacklist button; the list itself is kept and resumes filtering once the toggle is turned back on.

### List Sync

The Channel Whitelist, Channel Blacklist, Title Whitelist and Title Blacklist follow you across devices, and there is no fixed limit on how many entries they hold. Each list is saved in the browser first, then synced to your other devices in a compact format: sorted, with the part each entry shares with the previous one stored only once, compressed and encoded densely. Chrome gives every extension 100 KB of synced storage, and that fits roughly 12,000 to 14,000 channels and words across the four lists, about half again as many as the format used before 3.7.0. Past that point the lists keep working and keep growing on the device where they were added: the list cards show a "Sync paused" notice that says nothing is lost, the Manage page explains it in plain words, other devices keep the last version that fit, and syncing resumes on its own once the lists are small enough again. Changes made on another device while sync is paused are still merged in, without dropping any entry that only this device has. The marked watched videos share this synced storage, but never at the lists' expense: when the lists need the room, the marked videos stop syncing instead.

### Title Whitelist

Exempt videos by a word or phrase in their title rather than by channel. Type a word into the **Title Whitelist** card in the popup and press Enter or **+ Add**: every video whose title contains it is never hidden or dimmed by any filter, on every page. Matching is case-insensitive and looks for the word at the start of a word in the title: "tutorial" also matches "tutorials" and "AI" matches "AI-generated", but "AI" does not match "said". In languages written without spaces (Chinese, Japanese, Thai, ...) the word is found anywhere in the title. The list syncs across devices together with the channel lists (see [List Sync](#list-sync)), with no size limit of its own. The card shows how many words are listed and opens the full list on the [Manage page](#manage-page), changes apply to the open page immediately, and the card's switch pauses the whole list without clearing it. A blacklisted channel or a title containing a Title Blacklist word stays hidden even when a title matches, and Shorts are always filtered regardless.

### Title Blacklist

The opposite of Title Whitelist: every video whose title contains one of the listed words or phrases is always hidden, everywhere, including Shorts, Mixes and Playlists, regardless of any other filter's own on/off state. A blacklisted word always wins: it hides the video even from a whitelisted channel, and even when the same title also contains a Title Whitelist word. Matching follows the same rules as the Title Whitelist (case-insensitive, from the start of a word, anywhere in the title for languages written without spaces), and the list syncs the same way. Words are added from the **Title Blacklist** card in the popup or from the [Manage page](#manage-page); there is no on-page button for it. In Dim mode, the overlay names the word that matched, for example **Blacklisted word: "reaction"**, so it is always clear why a video was hidden. Removing a word shows those videos again immediately, and the card's switch pauses the whole list without clearing it.

### Manage Page

Every **Manage** button in the settings menu opens one page, in its own browser tab, with a tab for each list in the same order as the menu: **Marked as watched**, **Channel Whitelist**, **Channel Blacklist**, **Title Whitelist** and **Title Blacklist**. If the page is already open, the button switches it to the right tab instead of opening a second copy. It is built for lists of thousands of entries:

- **Add in bulk**: paste handles (`@veritasium`), channel links or words, one per line. Before anything is saved, a preview counts what is new, what is already listed, which channels will move over from the opposite list, and which lines were not recognized, which stay in the box for correction
- **Search and sort**: the list filters while you type and says how many entries match; sort by most recently added or alphabetically. Rows load 50 at a time
- **Select and act in bulk**: click a row or its checkbox, Shift-click to select a range, then select every matching entry at once. Remove the selection or move it to the opposite list
- **Undo everything**: every add, removal and move offers **Undo** for 10 seconds, and the timer waits while the pointer or keyboard focus is on the message. **Clear all** is the only action that asks first, and its dialog offers to export a backup before anything is removed
- **Sync status in plain words**: a single quiet line says the lists are synced. Only when the synced space is about 80% full does it turn into a warning with a bar and an estimate of how many more channels or words still fit, and a paused or outdated sync is explained there too, including that nothing is lost
- **Export and import** all five lists in one JSON file. Importing only ever adds: the preview says what each list will gain, and nothing already listed is removed or changed. Files exported from the old marked videos page are still accepted

Each list keeps its on/off switch on the page too, and the page is fully usable from the keyboard, with the arrow keys moving between tabs.

### Master Extension Switch

Use the **Extension** switch in the popup header to instantly enable or disable the entire extension. When disabled, filtering is paused globally and the badge shows **OFF**.

### Header Settings Button

A small gear button lives right in YouTube's own header (desktop only), next to the Create button, giving you instant access to your full settings without opening the extension popup separately. Clicking it opens a dropdown with the exact same settings UI as the popup. It appears on every page, including Watch, since it lives in page chrome rather than floating over the video. On first install, a guided spotlight tutorial walks you through the button and its dropdown - you can restart it anytime from the popup.

### Hide On-Page Controls

For a more discreet setup, enable **Hide on-page controls** in **Extra Settings** to remove all of the extension's on-screen elements from YouTube - the header settings button, the inline "Whitelist"/"Blacklist" buttons, the overlay's "Whitelist"/"Unblacklist"/"Unmark" button, and the hover "Blacklist"/"Watched" pill. Filtering keeps working in the background. This is the only way to hide the header button; there is no separate toggle for it.

### Simple Mode & Advanced Mode

The popup starts in **Simple Mode** for quick everyday use. When you need page-level control, open **Extra Settings** and turn on **Advanced Controls** to switch to **Advanced Mode**, where per-page toggles are available for each filter.

### Languages

The interface is available in English, Spanish, Brazilian Portuguese, German, French, Italian, Japanese, Russian, Turkish, Indonesian and Korean, and follows your browser's language. Numbers, dates, the slider values and the dim overlay labels are written the way YouTube writes them in that language. The names **Whitelist** and **Blacklist** stay in English everywhere. Independently of the interface language, view counts and upload dates are read correctly with YouTube set to any of its 82 interface languages.

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

This creates a zip file in `dist/` containing only the files needed by the extension. The script automatically reads `manifest.json` and parses `popup.html` to collect all referenced files, and includes every translation in `_locales/`.

---

## Project Structure

```
youtube-hider-extension
├── _locales/              Interface translations, one messages.json per language (en is the default)
├── assets/
│   └── icons/
│       ├── youtube-hider-logo.png
│       └── YT Hider icon v6.png
├── content/
│   ├── page-bridge.js     MAIN-world script: caches video-id-to-channel mappings from YouTube's internal data
│   ├── env.js             DEV_MODE flag
│   ├── utils.js           Shared utilities (debounce, logger, safe storage)
│   ├── i18n.js            Translation helpers: messages, plurals, number and date formatting
│   ├── whitelist-utils.js Pure list helpers shared by the Channel and Title Whitelist and Blacklist and the marked watched videos
│   ├── state.js           Preferences, timing constants, storage listener
│   ├── header-button.js  Header settings button and its iframe-embedded settings dropdown
│   ├── tutorial.js        Guided spotlight tutorial
│   ├── parsers.js         View count, upload date and channel parsers
│   ├── filters.js         Video hiding/filtering logic, Channel Whitelist and Unblacklist overlay buttons
│   ├── channel-whitelist-button.js  Inline Whitelist button next to Subscribe
│   ├── channel-blacklist-button.js  Inline Blacklist button and the hover Blacklist/Watched pill on video cards
│   └── init.js            Page detection, observers, bootstrap
├── popup/
│   ├── popup.html         Settings popup UI
│   ├── data.js            Popup constants and utility functions
│   ├── popup.js           Popup initialization and event handling
│   ├── base.css           Variables, reset, header, layout, simple/advanced states
│   ├── cards.css          Setting cards and slider controls
│   ├── toggles.css        Toggle grid, switches, footer
│   ├── filters.css        Tooltips, date filter, overlap warning
│   ├── support.css        Support button and support panel
│   ├── manage.html        Manage page for all five lists, opened in a tab
│   ├── manage.js          Manage page logic: tabs, add, search, select, undo, sync status, export, import
│   └── manage.css         Manage page styles
├── tests/
│   ├── parsers.test.js           Parser regression tests
│   ├── channel-list-sync.test.js List sync encoding (v1 and v2), chunking, capacity and merge tests
│   ├── marked-watched-sync.test.js Marked watched sync encoding, merge and quota priority tests
│   ├── whitelist-utils.test.js   Title keyword matching, list input parsing, import and marked watched list tests
│   └── i18n.test.js              Translation catalog checks: keys, placeholders, plurals, store limits
├── background.js          Service worker (badge, lifecycle, messaging, channel list and marked watched sync)
├── channel-list-sync.js   Pure list sync helpers: compact encoding, chunking, quota planning, merge
├── marked-watched-sync.js Pure marked watched sync helpers: encoding, chunk layout, merge
├── build.ps1              Build/packaging script
├── CHANGELOG.md           Version history
├── LICENSE                MIT License
├── manifest.json          Extension manifest (MV3)
├── store-listing/         Chrome Web Store description per language
└── README.md
```

---

## How It Works

1. **Content scripts** (13 files in `content/`) load on YouTube pages in the order defined by `manifest.json`. They share a global scope via Chrome's isolated world. `page-bridge.js` is the exception: it runs in the page's `MAIN` world at `document_start` to read YouTube's own internal data and expose a video-id-to-channel cache via a DOM attribute, since the isolated world can read the DOM but not the page's JavaScript globals.
2. A **MutationObserver** watches for DOM changes and triggers hiding/filtering logic based on your preferences.
3. Settings are stored in `chrome.storage.sync`, so they follow you across devices. The Channel Whitelist, Channel Blacklist, Title Whitelist and Title Blacklist are the exception: they live in `chrome.storage.local`, and the service worker mirrors them into `chrome.storage.sync` in one compact, compressed payload split into chunks, so they sync too without being capped by the 8 KB per-item sync quota. The marked watched videos work the same way, with their titles and channels kept in `chrome.storage.local` only.
4. The **header button** (`content/header-button.js`) uses a closed Shadow DOM to encapsulate its styles from the host page. Its settings dropdown embeds `popup/popup.html` in an `<iframe>`, created fresh on every open, so the dropdown is always the same, unmodified popup UI.
5. The **background service worker** manages badge updates, extension lifecycle events and messaging between popup/content scripts.

---

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## License

This project is licensed under the [MIT License](LICENSE).
