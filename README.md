# Skipper

Skipper is a lightweight Chrome extension that hides watched YouTube videos and automatically skips intros, recaps, trailers, and promos on Netflix and Prime Video.

Extension title: "Productivity Skipper - YouTube, Netflix and Prime"
Chrome Web Store DOWNLOAD: https://chromewebstore.google.com/detail/ebpikpmmnpjmlcpanakfcgchkdjaanmm?utm_source=item-share-cb

## Features

**YouTube “Hide Watched”**

- Hide videos you’ve already watched in both the Home/Subs pages and Search results.
- Customizable threshold (0–100%) for marking a video as watched.
- Separate toggles for hiding in the Home feed and in Search results.

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

## Usage

1. Click the Skipper icon in the toolbar to open the settings popup.
2. **Auto Skip**

   - Adjust the **Delay** slider (in seconds).
   - Toggle the **Enable Skip** switch on or off.

3. **Hide Watched**

   - Adjust the **Threshold** slider (in percent).
   - Toggle **Hide in Home** and **Hide in Search** as required.

4. Click **Save**. Your settings are stored and the badge will update automatically.

## Configuration

Settings are persisted via `chrome.storage.sync`, so they remain consistent across devices:

- `skipIntroDelay` (integer): Delay in seconds before clicking skip.
- `skipEnabled` (boolean): Enable or disable auto-skip.
- `hideThreshold` (integer): Percentage threshold for marking a video as watched.
- `hideHomeEnabled` (boolean): Enable hiding in YouTube Home feed.
- `hideSearchEnabled` (boolean): Enable hiding in YouTube Search results.

## Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/your-feature`).
3. Commit your changes (`git commit -m "Add feature"`).
4. Push to your branch (`git push origin feature/your-feature`).
5. Submit a pull request for review.

Thanks!
