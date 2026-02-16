# Changelog

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
