# Changelog

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
