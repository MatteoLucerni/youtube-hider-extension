# Changelog

### Version 2.7.0

**Added**

- Hide Mixes: removes YouTube Mix playlists from feed, search results and related sidebar
- Hide Playlists: removes YouTube playlists from feed, search results and related sidebar
- Hide Lives: removes live streams from feed and search results
- Combined Hide Shorts, Hide Mixes, Hide Playlists and Hide Lives into a single unified card
- Easy Mode now shows 4 quick toggles (Shorts, Mixes, Playlists, Lives) in a 2x2 grid
- Floating mini-panel updated with Hide Mixes, Hide Playlists and Hide Lives toggles
- Upload Date Filter: hide videos by their upload date with two independent sub-filters
  - "Hide newer than" - hide videos uploaded more recently than a chosen threshold
  - "Hide older than" - hide videos uploaded longer ago than a chosen threshold
  - Both sub-filters can be used together to keep only a specific age range
  - Logarithmic time steps: 1 day, 3 days, 1 week, 2 weeks, 1 month, 2 months, 3 months, 6 months, 1 year, 2 years, 5 years, 10 years
  - Per-page toggles (Home, Channel, Subs, Search, Related) shared between both sub-filters
  - Full support in the floating mini-panel (master toggle + 2 sub-toggles + 2 sliders)
  - Multi-language upload date parsing (EN, IT, FR, DE, ES, PT, RU, JA, KO, AR and more)
  - Supports classic, new (`yt-content-metadata-view-model`), and mobile YouTube layouts

**Refactored**

- Split monolithic content.js (3000+ lines) into 11 focused modules organized in content/ and content/fab/
- Split popup.js (655 lines) into data.js (constants/utilities) and popup.js (initialization/events)
- Split popup.css (935 lines) into 4 files: base.css, cards.css, toggles.css, filters.css
- Organized project into content/, content/fab/, popup/ folder structure
- Split content-fab.js (1200 lines) into fab/styles.js, fab/panel.js, fab/core.js

**Improved**

- Upload Date Filter layout and UX improved in both popup and mini-panel
- All slider tooltips updated: now explain that dragging fully left disables the filter
- Removed switches for all settings that have a slider: now you just drag the slider fully left to turn off the feature
- Overlap error message is clearer and matches the width of the filter boxes
- No more layout shift in the mini-panel when the overlap warning appears or disappears
- Tutorial updated: now mentions the Upload Date Filter and how to disable filters
- Mini-panel tooltips are always visible and never cut off or out of viewport
- Removed all uses of the em dash (—) symbol in code and documentation

**Fixed**

- Minimum Views Filter incorrectly parsed upload time strings (e.g. "44 minuti fa", "2 minutes ago") as view counts: the suffix "mi" (x1000) matched the start of "minute/minuto/minuti" in all Latin-based languages, producing a spurious high-confidence reading of 44,000 views that prevented low-view videos from being hidden until a much higher threshold was set

### Version 2.6.0

**Removed**

- Removed Auto-Skip feature for Netflix and Prime Video (Chrome Web Store Single Purpose policy compliance)
- Removed Netflix and Prime Video host permissions and content script injection
- Simplified badge indicator: no badge when active, "OFF" when all disabled (removed "A", "S", "H" states)

**Added**

- Changelog link and dynamic version number in popup footer

### Version 2.5.2

**Fixed**

- Minimum Views Filter rewritten with language-agnostic parsing (works with all YouTube interface languages)
- View count parser now supports 17+ suffix formats (K, M, Mln, Mio, 万, 만, тыс, млн, etc.)
- Fixed decimal/thousands separator detection across locales
- Fixed Strategy A only checking the first metadata span instead of all spans
- Fixed Strategy C hardcoding the second metadata row as views
- Removed duplicate un-debounced MutationObserver
- Fixed stale pathname bug after SPA navigation

### Version 2.5.1

**Added**

- Guided spotlight tutorial: 5-step tour replaces the old onboarding system (welcome toast, FAB pulse, tip bubble, panel green flash, first-action toast)
- Welcome card on first YouTube visit with "Start Tutorial" and "Skip" (disabled for 5 seconds)
- Tour spotlight with blocking overlay and cutout on the highlighted element
- "Restart Tutorial" button in the Floating Button card (popup) with visual confirmation
- `safeStorageSet()` utility in utils.js with `chrome.runtime.lastError` check
- `safeSendMessage()` utility in utils.js with `.catch()` error handling

**Fixed**

- Crash in `finishTour()` when floating button is removed during the tour
- Orphaned tutorial overlay and tour elements during SPA navigation (new `cleanupTour()`)
- `skipInterval` timer leak on navigation
- Document `click`/`keydown` listeners never removed after floating button removal
- Resize resetting the button position instead of clamping to current edge
- `DEV_MODE = true` shipped in production builds (build.ps1 now forces `false`)
- Tutorial impossible when floating button is disabled (`forceForTutorial` parameter)
- Tutorial repeating infinitely when FAB is missing at start time
- Disabling floating button from popup during active tour now runs proper cleanup
- "Restart Tutorial" button padding misaligned

**Removed**

- Old onboarding system (6 separate mechanisms)
- Dead code `fabWasDisabled`

### Version 2.5.0

- Floating button is now hidden on video watch pages for a cleaner viewing experience
- Floating button is now draggable and snaps to the nearest viewport edge on release
- Floating button remembers its position across page reloads (stored locally per device)
- Mini-panel automatically aligns based on the floating button position
- Added build script (`build.ps1`) for packaging the extension for Chrome Web Store upload
- Added `short_name` to manifest.json
- Rewrote README with shields.io badges and richer documentation
- Added MIT LICENSE file
- Improved `.gitignore` with standard patterns for OS files, editor settings, build artifacts and promo graphics

### Version 2.4.0

- Welcome page now redirects to youtubehider.com
- Removed local welcome page files (HTML, JS, CSS)
- Welcome toast moved to top-right corner, closer to the toolbar
- Added bouncing arrow animation pointing to toolbar icon
- Increased welcome toast appearances from 3 to 5 visits
- Floating button now pulses on first 2 sessions to attract attention
- Added confirmation toast on first setting change from mini-panel
- Panel rows highlight on first open to guide new users
- Mini-panel: added minimum views slider
- Mini-panel: grouped toggles and sliders into visual cards
- Mini-panel: added info icon tooltips on each setting
- Mini-panel: added toolbar hint text in footer
- Mini-panel: replaced arrow with external redirect icon on "Open full settings"
- Compacted mini-panel footer layout

### Version 2.3.1

- Fixed tooltips visibility for page options
- Fixed tooltips overflow preventing text from being cut off
- Improved tooltip icon vertical alignment with labels

### Version 2.3.0

- Added mobile youtube (m.youtube.com) support
- Added infinite loading warning
- Added tooltips for filter sliders

### Version 2.2.0

- Now hiding also in Channel page
- Fixed shorts icon not hiding
- Reduced debounce time

### Version 2.1.0

- Fixed path handle
- After uninstall form for feedback
- Popup link to report bug/give feedback

### Version 2.0.2

- Fixed autoskip repeated click bug

### Version 2.0.1

- Changed header title style

### Version 2.0.0

- New popup UI/UX
- Introducing "Easy Mode"
- Env variable for logging

### Version 1.6.0

- Now views selector has fixed values

### Version 1.5.9

- Corrected hide shorts bug, was hiding also if disabled

### Version 1.5.8

- Removing section divider in home and subs pages, was causing empty boxes

### Version 1.5.7

- Fixed selectors for hiding related and home low views videos
- Added observer for hiding related low views videos
- Fixed selectors for hiding related and home watched videos

### Version 1.5.6

- Fixed selectors for hiding related low views videos

### Version 1.5.5

- Fixed selectors for hiding related watched videos

### Version 1.5.4

- Added more selectors for hiding shorts

### Version 1.5.3

- Style and alignment

### Version 1.5.2

- Icon style

### Version 1.5.1

- Icon style

### Version 1.5.0

- Hide youtube Shorts everywhere
- Toggle for hide Shorts in Search results
- Changed extension name
- Fixed badge inizialization

### Version 1.4.0

- General Style and changed Extension name and branding

### Version 1.3.0

- New popup style
- Possibility to hide videos based on minimum amount of views
- Optimized sliders performance

### Version 1.2.0

- Auto save settings on edit
- Removed save button
