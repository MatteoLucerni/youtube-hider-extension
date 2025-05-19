# Skipper

Skipper is a lightweight Chrome extension that automatically skips intros, recaps, trailers, and promos on Netflix and Prime Video, so you can dive straight into the action without manual clicks.

## Features

* **Auto Skip**: Detects and clicks “Skip Intro”, “Skip Recap”, “Skip Trailer” and similar buttons.
* **Configurable Delay**: Set a custom delay (0–5 seconds) before the skip action.
* **Enable/Disable Switch**: Easily toggle the skipping feature on or off via a modern toggle switch in the popup.
* **Badge Indicator**: Shows a green "A" badge when enabled and gray "D" when disabled.

## Installation

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (top-right).
4. Click **Load unpacked** and select the extension folder.
5. Pin the Skipper icon in the toolbar if desired.

## Usage

1. Click the Skipper icon in the toolbar to open the settings popup.
2. Toggle the switch to enable or disable skipping.
3. Use the slider to adjust the delay before clicks (in seconds).
4. Click **Save settings**. The badge will update to reflect the current state.

Now, whenever you start a video on Netflix or Prime Video, Skipper will automatically click any available skip buttons after your configured delay.

## Configuration

All settings are stored using `chrome.storage.sync`, so they stay in sync across your devices (if you’re signed into Chrome).

* **skipIntroDelay**: Number of seconds to wait before clicking skip.
* **skipEnabled**: Boolean flag to turn skipping on/off.
