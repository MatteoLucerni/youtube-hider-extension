# Header Settings Button: Implementation Plan

## Context

The floating action button (FAB) and its draggable mini settings panel are being removed and replaced with a small icon-only button injected directly into YouTube's own header (masthead), next to the Create button. Clicking it opens a dropdown containing the exact same settings UI as the main extension popup, embedded via an iframe, instead of a hand-maintained subset of settings.

This addresses three problems with the current FAB:

- Two divergent settings surfaces to learn and to maintain in sync (the FAB mini-panel is missing several settings the full popup has, e.g. Advanced Mode per-page toggles, "Hide on-page controls", full whitelist management).
- The FAB's drag-and-drop/edge-snap positioning logic is a large amount of code whose only purpose is letting the user move a floating overlay out of the way of video content. A button embedded in the header's own layout does not need any of this.
- The FAB is deliberately hidden on `/watch` today to avoid obstructing the video. A header-anchored button lives in persistent page chrome, not over the video, so it can (and should) be available on every page, including `/watch`.

This is a MAJOR version bump: it removes/renames settings and changes default on-page behavior (notably, mobile web users lose on-page quick access entirely).

## Confirmed decisions

1. New button is desktop-only (`www.youtube.com`). On `m.youtube.com` there is no on-page quick-access element at all (no FAB, no header button); mobile users keep only the browser toolbar action popup.
2. The dropdown is the exact same UI as `popup/popup.html`, embedded via an `<iframe>` anchored to the new button, not a rewritten or hand-maintained subset.
3. No "open in a full separate tab" affordance inside the dropdown; the dropdown alone is sufficient.
4. The new button must be hidden whenever `prefs.hideInterfaceElements` ("Hide on-page controls") is on, exactly like the other on-page UI elements today.
5. Icon-only circular button (not a text-label pill), matching the icon-button sizing of its neighbors in YouTube's header. Reasoning: unlike the whitelist buttons (repeated on every video card, where an icon becomes visual noise), there is exactly one instance of this button in the whole UI, so it should look like "one more icon button in the toolbar row." A text pill risks not fitting when YouTube's own header runs low on horizontal space.
6. The new button is available on every page including `/watch` (no `/watch` exclusion, unlike the old FAB).
7. The "What's new" toast's incidental `/watch` exclusion (today it shares an `if/else` branch with the FAB's own exclusion, for no independent documented reason) is removed too, for a simpler `init()`.
8. Iframe lifecycle: destroy-and-recreate on every open/close, not kept alive in the background. Rationale: `popup.js`'s `GET_CURRENT_CHANNEL` round trip runs once at load; if the iframe were kept alive while the user navigated to a different video/channel, "Add current channel" could add the wrong channel. Destroying and recreating on every open reproduces the same freshness guarantee the toolbar action popup gets for free.
9. Tutorial reworked to 3 steps (down from 5): the button itself, the dropdown/full settings panel (with richer descriptive copy since individual rows can no longer be spotlighted inside a cross-origin iframe), and how to hide it via "Hide on-page controls".
10. `content/header-button.js` is a single new file (not split into a `header-button/{styles,core}.js` pair like the old `fab/` trio), since without drag physics or a duplicated settings UI the new code is roughly an order of magnitude smaller.

## Live DOM ground truth (verified against a real logged-in `www.youtube.com` session, both at a normal desktop window width and an iPad-sized width: structure was identical at both)

```
ytd-masthead
  #container
    #start   (back-button, hamburger/guide-button, ytd-topbar-logo-renderer logo, skip-navigation)
    #center  (yt-searchbox, search-button-narrow, voice-search-button, ai-companion-button[hidden])
    #end
      #masthead-skeleton-icons  (loading skeleton placeholder, normally not visible)
      #buttons
        ytd-button-renderer                       (the "Create" button; inner <button> has aria-label="Create"; rendered as a filled tonal pill with a "+" icon and "Create" text at both tested widths, never observed collapsing to icon-only)
        ytd-notification-topbar-button-renderer   (bell icon button, aria-label="Notifications", plain circular yt-icon-button, no text)
        ytd-topbar-menu-button-renderer            (contains #avatar-btn, aria-label="Account menu", a 32x32 avatar image inside a button)
```

None of this lives inside a real Shadow DOM (Polymer's "shady CSS" scoping via generated classes on light-DOM elements), so it is directly queryable/insertable with plain `document.querySelector`/`insertBefore`, no shadow root piercing needed.

**Anchor point**: insert the new button as the first child of `document.querySelector('ytd-masthead #end #buttons')`. This places it to the left of the Create button as intended, and is more robust than anchoring to the Create button element specifically, since it should keep working even if Create is ever absent (e.g. a signed-out state, not yet verified, see verification checklist).

**Not yet verified live** (treat as required manual-verification items before shipping, per this project's no-DOM-fixture-tests rule):
- Signed-out header layout: does `#buttons` still exist as a stable anchor when Create/notifications/avatar are replaced by a "Sign in" button?
- Behavior when YouTube's own SPA navigation re-renders the masthead region (does `#buttons`' content ever get swapped out without a full page reload?).

## File-by-file changes

### Deleted
- `content/fab/core.js`
- `content/fab/panel.js`
- `content/fab/styles.js`
- The now-empty `content/fab/` directory

### New
- `content/header-button.js`

### Modified
- `manifest.json`: content_scripts isolated-world array (replace the 3 `fab/*` entries with `content/header-button.js`, same position: after `state.js`/`warning.js`, before `tutorial.js`); bump `"version"` to `3.0.0`.
- `content/utils.js`: gains a relocated `isYouTube()`.
- `content/state.js`: `prefs` object, `initPrefs()`, `setupPrefsListener()`.
- `content/init.js`: `init()`, `detectPageChange()`, `onMutations()` (new cheap presence-check); `GET_CURRENT_CHANNEL` message listener is untouched (relocation-transparent).
- `content/filters.js`: gains relocated `getCurrentPageChannel()`.
- `content/tutorial.js`: full step-list rewrite, all FAB-symbol renames.
- `background.js`: `defaultSettings`, `migrateSettings()`, new migration function.
- `popup/popup.js`: id/var/key renames, tooltip copy.
- `popup/popup.html`: one settings-card row renamed, a few copy edits.
- `CLAUDE.md`, `README.md`, `CHANGELOG.md`, `docs/index.html`, `docs/welcome.html`, `package.json` (version).

### Unaffected, verified, no action needed
- `content/filters.js:315` and `:362` (`createDimBadge`/`applyFilter`'s `!prefs.hideInterfaceElements` checks) are already generic.
- `content/channel-whitelist-button.js:234-237` is already generic.
- `manifest.json`'s `web_accessible_resources` already lists `popup/popup.html` and the logo PNG scoped to the right origins.
- `build.ps1` reads `manifest.json` dynamically, so it packages whatever the manifest lists without further edits.

### Two issues found during review that this plan must account for

1. **`isYouTube()` and `isWatchPage()` are defined only in `content/fab/core.js`**, but consumed by `content/init.js` and `content/state.js`. Deleting `fab/core.js` wholesale would break those call sites.
   - `isYouTube()`: relocate unchanged into `content/utils.js` (loads early, no dependencies). Keep using it at its existing call sites (it still correctly gates behavior that legitimately still runs on `m.youtube.com`, like the "what's new" toast).
   - `isWatchPage()`: once every `/watch`-exclusion branch tied to the old FAB/tutorial/toast is removed, there are no remaining callers anywhere in the codebase (`filters.js`'s `isCoreFilterPath` and `channel-whitelist-button.js`'s `isInlineWhitelistPath` already do their own direct `pathname === '/watch'` checks). Delete it outright rather than relocating dead code, but double-check via a fresh grep right before deleting.

2. **Settings-migration race**: `background.js`'s generic "fill in missing settings keys" loop would see `headerButtonEnabled` as absent for every existing user and write it as `true` unconditionally, silently re-enabling the button for anyone who had deliberately turned the old `floatingButtonEnabled` off. This is the same class of hazard `tutorialCompleted` already has a fix for (the generic loop special-cases it, line ~108-110 in `background.js`, to avoid re-triggering onboarding for existing users). Reuse that identical pattern: special-case `headerButtonEnabled` in the generic back-fill loop to derive its value from `currentSettings.floatingButtonEnabled` if present, defaulting to `true` only if that legacy key was never set.

## Settings model change

**New pref**: `headerButtonEnabled` (default `true`), replacing `floatingButtonEnabled`. No replacement for `floatingButtonPosition` since the button is not draggable. After this change, `chrome.storage.local` holds only `whatsNewVersion`.

- `content/state.js` `prefs` object: remove `floatingButtonEnabled` and `floatingButtonPosition`; add `headerButtonEnabled: true`.
- `content/state.js` `initPrefs()`: delete the nested `chrome.storage.local.get('floatingButtonPosition', ...)` call; `chrome.storage.sync.get(Object.keys(prefs), ...)` is sufficient alone.
- `content/state.js` `setupPrefsListener()`:
  - Rename the `changes.floatingButtonEnabled` branch to `changes.headerButtonEnabled`, drop the `!isWatchPage()` clause, rename `createFloatingButton`/`removeFloatingButton` to `createHeaderButton`/`removeHeaderButton`.
  - Same renames and `!isWatchPage()` removal in the `extensionEnabled` and `hideInterfaceElements` branches; `floatingButtonHost` → `headerButtonHost`.
  - Delete the `area === 'local' && changes.floatingButtonPosition` branch entirely.
- `background.js` `defaultSettings`: replace `floatingButtonEnabled: true` with `headerButtonEnabled: true`.
- `background.js` `migrateSettings()`:
  - Add a special case in the generic back-fill loop (alongside the existing `tutorialCompleted` one): if the missing key is `headerButtonEnabled`, derive it from `currentSettings.floatingButtonEnabled` if present, else `true`.
  - Add a new one-time migration function (`migrateHeaderButtonCleanup`, same shape as `migrateSliderOff`), gated by a new sentinel (`headerButtonMigrationDone`):
    - `chrome.storage.sync.set({ headerButtonMigrationDone: true })`
    - `chrome.storage.sync.remove('floatingButtonEnabled')`
    - `chrome.storage.local.remove('floatingButtonPosition')` (new: existing migrations only ever touched `sync`)
  - Do not add `headerButtonMigrationDone` to `defaultSettings`, mirroring the existing `sliderOffMigrationDone` precedent.
- `popup/popup.js`: rename `floatingButtonToggle`/`floating-button-enabled` → `headerButtonToggle`/`header-button-enabled` throughout (the `storageKeys` array, the load path, `syncFloatingButtonToggleDisabled` → `syncHeaderButtonToggleDisabled`, the change listener).
- `popup/popup.html`: rename the `floating-button-enabled` id to `header-button-enabled`; update the card's label/description ("Floating Button" → "Header Button", description mentions it lives in YouTube's own header, desktop only); update the lock-tooltip copy; update the Channel Whitelist card's info tooltip and the Tutorial row's description to reference the header button instead of the floating button.
- `manifest.json`: replace the 3 `fab/*` content-script entries with `content/header-button.js` at the same position; bump version.

## Header button injection mechanism (`content/header-button.js`)

State variables (module-level): `headerButtonHost`, `headerButtonElement`, `headerDropdownHost`, `headerDropdownOpen`.

**`createHeaderButton(forceForTutorial = false)`**:
1. Guards, in order: `if (window.location.hostname !== 'www.youtube.com') return;` (deliberately narrower than the shared `isYouTube()`), `if (prefs.hideInterfaceElements) return;`, `if (headerButtonHost) return;`, `if (!forceForTutorial && !prefs.headerButtonEnabled) return;`.
2. Locate the anchor: `document.querySelector('ytd-masthead #end #buttons')`. If not found, bail (covers the not-yet-verified signed-out layout).
3. Build `headerButtonHost` (e.g. `<span id="yh-header-button-host">`), `attachShadow({ mode: 'closed' })`, inject self-contained CSS (no dependency on YouTube's own shady-CSS classes) plus a circular `<button aria-label="Youtube Hider Settings" title="Youtube Hider Settings">` containing the existing `assets/icons/youtube-hider-logo.png`.
4. Insert via `anchor.insertBefore(headerButtonHost, anchor.firstChild)`.
5. Wire `click` → `toggleHeaderDropdown()`.
6. Store `headerButtonElement` = the inner `<button>` (needed by the tutorial for spotlighting).

**Sizing/styling**: circular, roughly 40px hit target, roughly 20-22px icon, transparent background with a theme-aware hover state reusing the existing `isYouTubeDarkTheme()` helper (`content/channel-whitelist-button.js`). These are starting values to tune by eye against the real masthead during manual verification, not hard specs (no computed-style measurements of the real bell/avatar buttons were captured, only DOM structure).

**`removeHeaderButton()`**: mirrors the old `fab/core.js` teardown shape (minus resize/drag listener cleanup, which no longer exists): call `closeHeaderDropdown()` first, remove `headerButtonHost`, null out state vars.

**Surviving SPA navigation and masthead re-renders**: reuse the existing `MutationObserver` already running in `content/init.js`'s `onMutations()` rather than adding a second one. Add a cheap check:
```js
if (headerButtonHost && !headerButtonHost.isConnected) createHeaderButton();
```
This reuses the `.isConnected` idiom already used elsewhere in the codebase (`content/channel-whitelist-button.js`) for exactly this class of problem. Also call the same presence-check from `detectPageChange()`, replacing the old pathname-based remove/recreate logic.

**`content/init.js` changes**:
- `init()`: `tutorialPending` drops its `&& !isWatchPage()` clause; `createFloatingButton(tutorialPending)` → `createHeaderButton(tutorialPending)`, called unconditionally; the "what's new" toast branch also drops its `/watch` exclusion (confirmed decision).
- `detectPageChange()`: delete the pathname-based FAB remove/recreate block entirely, replace with the same `.isConnected` presence-check. Replace the old `if (fabShadow && miniPanelOpen) { syncPanelWhitelistRow(fabShadow); }` line with `closeHeaderDropdown()` (only if currently open). Closing rather than resyncing is consistent with the destroy-on-close iframe lifecycle decision.
- The `GET_CURRENT_CHANNEL` message listener needs no code change: it is already agnostic to where `getCurrentPageChannel()` is defined.

**`content/filters.js` changes**: relocate `getCurrentPageChannel()` (currently in `content/fab/panel.js`) into `content/filters.js`, right after `resolveChannelForElement` (the closest existing sibling thematically). `filters.js` already loads before both of `getCurrentPageChannel()`'s remaining callers (`content/channel-whitelist-button.js` and `content/init.js`).

## Iframe dropdown mechanism

**Structure**: a second top-level host, `headerDropdownHost`, appended to `document.body` (not nested inside `headerButtonHost`), mirroring how the tutorial's own hosts are also separate top-level elements. This avoids any risk of the masthead's own stacking context/overflow clipping the dropdown, and keeps positioning math simple (`position: fixed`, computed from `headerButtonElement.getBoundingClientRect()`). Closed shadow root, self-contained CSS reusing the existing dark-panel palette (`#222222` background / `#3a3a3a` border) for the card chrome around the iframe.

**Sizing**: iframe width fixed at 400px (comfortably under `popup/base.css`'s 500px "standalone mode" breakpoint, so no popup.html/CSS changes are needed to get the compact, already-tested layout). Height: since the masthead sits at the very top of the viewport, there is effectively never room above the button, so the dropdown always opens downward (a simplification versus the old FAB panel's up/down flip logic). Compute an available-height budget similarly to the old `applyFabPosition` (`spaceBelow = vh - buttonRect.bottom - GAP - EDGE_PAD`, capped at a sane max like 640px); the iframe's own document scrolls internally past that with no extra code needed.

**Horizontal position**: right-align the dropdown's right edge to the button's right edge (the button always sits in the right portion of the header), clamped so it never overflows the left edge on a narrow window either.

**Open/close interaction**:
- Click on the header button toggles the dropdown.
- Click-outside and Escape-to-close reuse the existing `onDocumentClick`/`onDocumentKeydown` pattern from the old FAB code, checking `!headerButtonHost.contains(e.target) && !headerDropdownHost.contains(e.target)`. A click inside the iframe's own document does not bubble to the parent document's click listener across origins, so this only needs to cover clicks landing on the parent page outside both hosts, which is exactly what is needed.
- **Iframe lifecycle**: destroy the `<iframe>` element on every close (user click, click-outside, Escape, or SPA-navigation auto-close) and create a fresh one (`iframe.src = chrome.runtime.getURL('popup/popup.html')`) on every open. This also means the popup's CDN Bootstrap stylesheet fetch only happens when the user actually opens the dropdown, not on every YouTube page load.
- On SPA navigation, just close (destroy) the dropdown rather than trying to keep it open across the navigation, avoiding any need for a cross-frame messaging protocol to resync a cross-origin iframe's internal state.

**`GET_CURRENT_CHANNEL` flow**: no changes needed beyond relocating `getCurrentPageChannel()` as described above. `chrome.tabs.query({active:true, currentWindow:true})` naturally resolves to the tab the iframe is embedded in, and `chrome.tabs.sendMessage` reaches the top-frame content script's listener regardless of the iframe's different origin, since content scripts never run inside the `chrome-extension://` iframe (its origin does not match `content_scripts.matches`).

## Tutorial rework (`content/tutorial.js`)

Renames throughout `cleanupTour()`, `startSpotlightTour()`, `computeTargetRect()`, `finishTour()`: `floatingButtonHost` → `headerButtonHost`, `fabElement` → `headerButtonElement`, `fabPanel`/`miniPanelOpen` → `headerDropdownHost`/`headerDropdownOpen`, `fabShadow` → `headerButtonShadow`. The welcome-card description text needs rewriting to reference the header button and the embedded full settings panel.

**Why not spotlight individual controls inside the iframe**: `iframe.contentDocument`/`contentWindow.document` are inaccessible from the parent for a cross-origin iframe (`chrome-extension://<id>` is a different origin than `https://www.youtube.com`), and reaching around that would require a `postMessage` protocol modifying `popup.js` specifically to serve the tutorial, working against the decision to embed the real, unmodified popup. `getBoundingClientRect()` on the `<iframe>` element itself, however, is an ordinary same-origin DOM read from the parent page (measuring our own frame element, not looking inside it), so spotlighting the whole dropdown as one rectangle is fine.

**New 3-step tour**:
1. **"Your Settings Button"**: spotlights `headerButtonElement`. Explains it is now built into YouTube's own header, appears on every page including Watch, and opens instantly.
2. **"Your Full Settings, Right Here"**: opens the dropdown, spotlights it as a whole. Carries more explanatory weight than before since individual rows can't be spotlighted, explicitly describing what's inside (Hide Watched Videos, Shorts/Mixes/Playlists/Lives, Minimum Views, Upload Date Filter, Filter Mode, Channel Whitelist, Simple vs. Advanced Interface Mode).
3. **"Tidy It Away Anytime"**: same target as step 2. Explains "Hide on-page controls" removes the header button (and the inline/overlay whitelist buttons), and that the button's own dedicated toggle sits next to it for hiding just the button without hiding everything else.

`computeTargetRect()`'s FAB-specific special-casing can shrink substantially: the old complexity existed because the FAB panel could anchor to any of 4 edges depending on drag position; the new dropdown always opens below/right of a fixed button, so a plain `getBoundingClientRect()` after the open transition resolves should suffice.

## Documentation checklist

- **`CLAUDE.md`**:
  - **File layout**: replace the `content/fab/` bullet with `content/header-button.js`.
  - **Content scripts** load-order list: replace the `fab/styles.js, fab/panel.js, fab/core.js` entry with `header-button.js` and its description.
  - **Settings** section: replace the `floatingButtonEnabled`/`floatingButtonPosition` bullet with `headerButtonEnabled`; update the sentence about what lives in `chrome.storage.local` (after this change, only `whatsNewVersion`).
  - **New standing reminder** (explicitly requested): near the Settings section, add a short paragraph stating that any new on-page graphical element added to this extension in the future must be checked against/wired into `hideInterfaceElements` ("Hide on-page controls") gating, naming the established two-part pattern: (1) an early-return guard at the top of the element's own creation function, and (2) a teardown/recreate branch inside `content/state.js`'s `setupPrefsListener()`'s `'hideInterfaceElements' in changes` handling.
- **`README.md`**:
  - **Features**: rename "Floating Quick-Settings Button" to "Header Settings Button"; rewrite the description (no drag/snap, lives in YouTube's own header, appears on every page including Watch, desktop-only).
  - **Hide On-Page Controls**: update the list of what it hides and the toggle name.
  - **Channel Whitelist**: the "four places to whitelist a channel" list shrinks to three (the dedicated mini-panel whitelist toggle has no replacement, since the dropdown reuses the popup's existing "Add current channel" button); update the Filter Mode sentence referencing "the floating mini-panel" too.
  - **Project Structure**: drop the `fab/` subtree, add `header-button.js`.
  - **How It Works**: update the file-count claim, drop the `floatingButtonPosition`-in-local-storage claim, update the FAB file reference to `content/header-button.js` and mention the iframe-embedded popup mechanism.
- **`docs/index.html`** and **`docs/welcome.html`**: both have a "Floating Quick Settings" feature card and prose referencing "the floating button"/"the floating panel" that need rewriting. Confirm the `full-easy.png`/`full-no-easy.png` screenshots do not depict the old floating button/mini-panel before assuming they are unaffected (their filenames suggest plain popup-UI screenshots, but this needs visual confirmation).
- **`content/tutorial.js`**: covered above.
- **`CHANGELOG.md`**: new entry above the current top version, describing the removal/replacement. Call out explicitly: floating button removed, header button added (desktop only), mobile users lose on-page quick access entirely (toolbar popup unaffected), settings dropdown is now the full popup. No em dashes, per this project's writing-style rule.
- **Versioning**: bump `manifest.json`'s and `package.json`'s `"version"` to `3.0.0` (MAJOR).

## Manual end-to-end verification checklist

No automated DOM-fixture tests for any of this, per this project's testing rule. Given this is likely the single most user-visible change in the project's history:

**Desktop, signed-in**
- [ ] Button appears as first child of `#buttons`, visually left of Create, on Home/Search/Channel/Subscriptions/Watch, including confirming it now appears on `/watch` too.
- [ ] Click opens the dropdown, right-aligned under the button, never clipped by the viewport edge or the masthead's own stacking context.
- [ ] Dropdown content is pixel-identical to the toolbar action popup (Simple mode, Advanced mode, whitelist chips, What's New modal if applicable).
- [ ] Click-outside closes it; Escape closes it; re-click toggles it closed.
- [ ] Reopening after closing shows a fresh, non-stale "Add current channel" state if the user navigated to a different channel/video while it was closed.
- [ ] SPA navigation while the dropdown is open closes it (no stale iframe content left showing).
- [ ] `hideInterfaceElements` ON hides the header button (and inline/overlay whitelist buttons still hide too); OFF restores it.
- [ ] The `headerButtonEnabled` popup toggle independently shows/hides the button while `hideInterfaceElements` is off, and is greyed out with the lock tooltip when it is on.
- [ ] `extensionEnabled` OFF removes the button; ON (with `headerButtonEnabled` true) restores it.

**Desktop, signed-out**
- [ ] Confirm `#buttons` (or an equivalent stable anchor) still exists when "Create"/notifications/avatar are replaced by "Sign in". If not, `createHeaderButton()`'s anchor lookup needs a fallback selector.

**Masthead re-render resilience**
- [ ] Trigger a scenario likely to cause Polymer to re-render `#end`/`#buttons` and confirm the `.isConnected` re-insertion check actually recreates the button without visible flicker or duplication.

**Window width**
- [ ] Repeat the above at both a normal desktop width and an iPad-sized width.

**Mobile (`m.youtube.com`)**
- [ ] Confirm zero on-page elements from this extension appear, and the toolbar popup still works normally there.

**Tutorial**
- [ ] Fresh install (or reset via the popup's Restart button) runs the 3-step tour end-to-end.
- [ ] Confirm the tour still behaves correctly if the very first page happens to be `/watch`.
- [ ] Confirm Back/Next/Skip-countdown still work, and finishing/skipping mid-tour leaves the dropdown closed and the button in a normal state.

**Settings migration** (needs a build from a pre-change version to test against)
- [ ] A user with `floatingButtonEnabled: false` stored, upon update, ends up with `headerButtonEnabled: false`, not silently reset to `true`.
- [ ] `floatingButtonEnabled` is removed from `chrome.storage.sync` and `floatingButtonPosition` is removed from `chrome.storage.local` after the migration runs.
- [ ] A brand-new install gets `headerButtonEnabled: true` directly from `defaultSettings`, with no migration function ever running.

## Critical files for implementation

- `content/header-button.js` (new)
- `content/state.js`
- `content/init.js`
- `content/tutorial.js`
- `content/filters.js`
- `content/utils.js`
- `background.js`
- `manifest.json`
- `popup/popup.js`
- `popup/popup.html`
