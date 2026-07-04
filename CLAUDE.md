# YouTube Hider: Project Instructions

## Writing style (mandatory)

Never use em dashes anywhere in this repo: code, comments, commit messages, CHANGELOG entries, README, this file. Use a period, comma, or colon instead. This was already cleaned up once (see the CHANGELOG's Version 2.7.0 entry about removing em dashes from code and documentation) and must not regress.

## What this is

A Chrome MV3 extension for YouTube: hides or dims already-watched videos, low-view videos, Shorts, Mixes, Playlists, Lives, and videos outside a chosen upload-age window, plus a Channel Whitelist to exempt specific channels. Plain vanilla JS/CSS/HTML, no build tool or bundler. The only Node tooling is `package.json`'s `node --test` for the parser unit tests in `tests/`; the extension itself has zero npm dependencies and every content-script file must stay directly loadable as an unpacked extension as-is. `build.ps1` packages the reviewed source into a Chrome Web Store zip; it does not transform the code beyond forcing `env.js`'s dev flag to `false`.

## Surfaces

One site (`youtube.com` / `m.youtube.com`), five distinct surfaces, each with its own per-surface enable flags for most filters: Home (`/`), Search (`/results`), a Channel page (`/@handle`), Subscriptions (`/feed/subscriptions`), and the Watch page (`/watch`, where filters apply to the related-videos sidebar, not the video being played). `isCoreFilterPath` in `content/filters.js` defines which pathnames Shorts/Mixes/Playlists/Lives hiding applies to; the Upload Date Filter and view/watched filters use their own `shouldHideX(pathname)` gates in the same file, each checking both a numeric threshold and the matching per-surface `*Enabled` flag from `prefs`.

**Two renderer eras coexist**, and every filter function must handle both because YouTube runs them concurrently across surfaces and account-level experiments, not as a clean cutover:
- **Legacy**: `ytd-*` custom elements (`ytd-rich-item-renderer`, `ytd-video-renderer`, etc.) with `#metadata-line` spans, plus the `ytm-*` mobile equivalents.
- **New**: `yt-lockup-view-model` / `yt-content-metadata-view-model`, with metadata read via `getMetadataSpansFromContainer` in `content/filters.js`.

Within the new renderer, the exact text YouTube emits for a video's age is itself inconsistent: full words ("7 years ago") and compact abbreviations ("7y ago") have both been observed, gated by a server-side experiment cohort (visible as `fexp=` IDs in YouTube's own network requests) that cannot be forced from the client. Treat "I can't reproduce the exact string locally" as expected, not as evidence a report is wrong. Trust concrete DOM/HTML evidence from a report over an inability to reproduce it in a different account. See `content/parsers.js`'s `TIME_UNIT_ENTRIES` for the resulting policy: support both forms for every supported language, never assume only one is live at a time.

## File layout (flat, repo root)

- `manifest.json`: MV3 manifest; single source of truth for the content-script load order below and for permissions (`storage`, host permissions on `youtube.com`/`m.youtube.com` only).
- `background.js`: service worker. Initializes and migrates `chrome.storage.sync` settings (`initializeSettings`, `migrateSettings`, `migrateSliderOff`, the latter being a one-time conversion from old boolean per-filter toggles to the current "slider at 0 = Off" model, kept for users updating from older versions), opens the welcome page on install and a "what's new" flag on minor-version updates, keeps the toolbar badge text/color in sync with whether any filter is currently active, and handles the `openSettings` runtime message (opens `popup/popup.html?standalone=true` as a full tab).
- `content/env.js`: single dev-logging flag, `window.DEV_MODE`. Loaded first. `build.ps1` rewrites it to `false` when packaging for the Chrome Web Store.
- `popup/`: `popup.html` / `popup.js` / `data.js` plus `base.css`, `cards.css`, `filters.css`, `toggles.css`, the full settings UI, reachable either as the toolbar action popup or as a standalone tab.
- `tests/parsers.test.js`: Node's built-in test runner against `content/parsers.js` (the only file with a Node-compatible `module.exports` guard). Run with `npm test` / `node --test`.
- `assets/icons/`: extension + toolbar icons, including the light/dark logo variants used by on-page UI.
- `build.ps1`: reads `manifest.json` to determine exactly which files ship, copies them to a temp dir, forces `env.js`'s dev flag off, and zips to `dist/{short_name}-{version}-{timestamp}.zip`.
- `docs/`: static marketing site for youtubehider.com (GitHub Pages).
- `yt-structures/`: saved YouTube page HTML snapshots for reference when a selector needs updating; not loaded by the extension.

### Content scripts (injected into `youtube.com` and `m.youtube.com`)

Two separate content-script entries in `manifest.json`, both matching the same URLs but with different worlds/timing:

1. `content/page-bridge.js`, **MAIN world**, `document_start`. Runs in the page's own JS context (not the isolated content-script world) so it can read `window.ytInitialData` and intercept `fetch`/`XMLHttpRequest` calls to YouTube's internal `/youtubei/v1/` endpoints. It walks that JSON to build a video-id to channel-handle cache (covering renderer shapes the visible DOM doesn't always expose a channel link for) and publishes it as a `data-yt-hider-channel-cache` attribute on `<html>`, since a MAIN-world script cannot call into the isolated-world content scripts directly. `content/parsers.js`'s `readChannelCacheFromDOM` reads that attribute back on the isolated side.
2. The isolated-world bundle, `document_idle`, loaded in this exact order. This order is **load-bearing**, since these are classic scripts sharing one global scope and later files reference symbols declared in earlier ones:
   1. `content/env.js`: `window.DEV_MODE`, must load first.
   2. `content/utils.js`: `logger` (log/warn/error/info, all gated on `DEV_MODE`), `debounce`, `safeStorageSet`, `safeSendMessage`, `pollUntil` (generic timeout-bounded DOM-readiness polling used by both page-load detection and the inline whitelist button).
   3. `content/whitelist-utils.js`: pure array/list helpers for the whitelist (`channelListIncludes`, `computeWhitelistUpdate`), no `chrome.*` or DOM dependency.
   4. `content/state.js`: `TIMING` constants, the `prefs` object (the single in-memory source of truth for every setting, hydrated from `chrome.storage` and kept live via `chrome.storage.onChanged`), and the whitelist query helpers (`isChannelExempt`, `isChannelPaused`, `setChannelWhitelisted`) that the rest of the codebase calls into.
   5. `content/warning.js`: the "high filtering, loading may get stuck" toast (rate-limited via `detectInfiniteLoaderLoop`) and the post-update "what's new" toast.
   6. `content/fab/styles.js`, `content/fab/panel.js`, `content/fab/core.js`: the draggable floating quick-settings button, rendered inside a closed shadow root. `styles.js` is the CSS-in-JS string, `core.js` creates/positions/drags the host element, `panel.js` renders the mini-panel HTML and keeps its sliders in sync with `prefs`.
   7. `content/tutorial.js`: first-run onboarding (welcome card + spotlight tour over the floating button), also in a closed shadow root.
   8. `content/parsers.js`: pure parsing, no filtering side effects. Locale-aware view-count parsing (`extractViewCount`) and upload-age parsing (`extractUploadAgeDays`, `resolveUploadAgeFromSpans`). Guarded by a `module.exports` check so it also runs unmodified under Node for `tests/parsers.test.js`. See **Parsing rules** below before touching this file.
   9. `content/filters.js`: all hide/dim logic. `applyFilter` is the single choke point deciding hide vs. dim, whitelist exemption, and the dim-mode badge/overlay; the per-filter `hideX`/`shouldHideX` pairs cover watched, views, Shorts, Mixes, Playlists, Lives, Upload Date; `getVideoContainerSelectors`/`findAndHideContainer` is the shared legacy/new-renderer selector logic every filter reuses.
   10. `content/channel-whitelist-button.js`: the inline "Whitelist" button injected next to Subscribe on watch/channel pages (distinct from the badge whitelist button rendered inside a dimmed overlay by `filters.js`). Neither button variant shows the extension logo, to keep the on-page footprint minimal; only the floating quick-settings button does. Both instead show a plain tooltip on hovering the whole button, explaining the action and pointing to "Hide on-page controls" for users who want these buttons gone entirely (shared copy fragment `WHITELIST_SETTINGS_TIP` defined once in `filters.js`, reused here since isolated-world files share one scope).
   11. `content/init.js`: **entry point**. `PAGE_SELECTORS`/`waitForPageElements` (SPA readiness gating per pathname, since `document_idle` fires before YouTube's client-side router has populated the page), `startHiding` (calls every `shouldHideX`/`hideX` pair), `detectPageChange`/`onMutations`/`debouncedHiding` (YouTube is a SPA with no full navigation between pages, so page changes are detected via `MutationObserver` plus pathname polling), `init()` (bootstraps prefs, styles, the observer, and first-run tutorial/what's-new), and the `chrome.runtime.onMessage` listener for `GET_CURRENT_CHANNEL` (used by the popup to know which channel to show in its per-page whitelist toggle).

Keep new top-level execution in `content/init.js`, the same way `content.js` is the only file with top-level execution in a comparable layered content-script project. Every other file in the isolated-world list should be declarations only, so load order stays forgiving. Keep function/variable names unique across all isolated-world files; they share one scope.

## Parsing rules (`content/parsers.js`)

- `extractUploadAgeDays` requires the time unit to sit **immediately** after the number (only spaces allowed) via `TIME_UNIT_ANCHORED`'s leading match, and requires whatever follows the unit to be either end-of-string or a known relative-date marker (`ago`, `fa`, `назад`, `前`, `전`, ...) via `RELATIVE_SUFFIX`. Both checks are generic across every unit, not special-cased per word. This is what stops channel/title text like "5-Minute Crafts" or "3d Printing Tips" from being misread as an upload date, without needing a matching guard for every new abbreviation added to `TIME_UNIT_ENTRIES`.
- `TIME_UNIT_ENTRIES` must carry **every language YouTube localizes into**, and for each unit, both the long word(s) and any short abbreviation YouTube is known to render (e.g. `year`/`years`/`yr`/`yrs`/`y`). Longer alternatives are tried first (`Object.keys(...).sort((a,b) => b.length - a.length)`), so adding a short form never regresses an existing long-form match.
- `resolveUploadAgeFromSpans` deliberately keeps the **last** valid age found across metadata parts (split on `·`/`•`), not the first, because the upload date is conventionally the final metadata item and an earlier span (a channel name, a view count) can otherwise be misread as the date.
- `extractViewCount`/`extractNumberAndSuffix` handle mixed thousands/decimal separators per locale (`normalizeNumStr`). Do not assume `.` is always a decimal point or `,` is always a thousands separator: which one wins depends on whether a magnitude suffix (K/M/B/Mln/...) is present.
- Any change here must keep `tests/parsers.test.js` green (`npm test`) and add a case for the specific string that motivated the change, not just a generic one. The existing tests are almost all regression tests for a specific real-world string that once broke.

## Testing rule (mandatory)

- **`content/parsers.js` is the only file with an automated-test requirement.** Any fix or feature touching it must add/update a regression test in `tests/parsers.test.js` using the literal string from the real-world case that motivated the change (a reported string, not a hand-made generic one), and `npm test` must stay green.
- **Do not add DOM-fixture-based automated tests** (jsdom, saved HTML snapshots, or similar) for `content/filters.js`, `content/init.js`, `content/fab/*`, `content/tutorial.js`, `background.js`, or `popup/*`. YouTube's DOM is not a single stable target to freeze into a fixture: the same page can render structurally different markup for different accounts at the same time, gated by server-side experiments outside our control (this is exactly what made issue #50 hard to reproduce locally: one account saw abbreviated dates, another saw full words, on the same day). A fixture-based test would only prove the code still matches a frozen, possibly-already-outdated snapshot, which is false confidence, not real coverage.
- Instead, any change touching selectors or DOM-dependent logic requires **manual verification in a real, current browser session** before it's considered done: load the affected YouTube page(s) with the change active and confirm the behavior, the same way the fix for #50 was verified against the reporter's real HTML and a live console check. Use the `verify` skill for this when applicable.
- When a bug report includes a real HTML/DOM snippet (or one can be obtained from the reporter), treat that snippet as the regression case to encode into `tests/parsers.test.js` if it exercises parsing logic. This keeps the test suite driven by real, dated evidence instead of speculative or aging fixtures.
- **For ad hoc live-DOM debugging (checking a hypothesis against the real YouTube DOM, verifying a fix before writing it, etc.), never create a standalone `.js` file in the project.** Write the throwaway script directly in the chat response, in a code block, together with plain instructions for where to paste it (browser DevTools console) and what page(s) to run it on. If it is useful to auto-copy results, end the script with `copy(JSON.stringify(...))` so the user can paste the output straight back into the chat. Nothing from this kind of debugging session should be committed to the repository or left on disk once the investigation is done.

## Settings

All defined in `content/state.js`'s `prefs` (content-script runtime state) and mirrored in `background.js`'s `defaultSettings` (first-install defaults + migration). Stored in `chrome.storage.sync` **except** `floatingButtonPosition` and `whatsNewVersion`, which live in `chrome.storage.local` since they are per-device UI state, not a filtering preference to sync across a user's browsers.

- `extensionEnabled` (default `true`): master switch. Off tears down all filtering and the extension's own on-page UI.
- Hide Watched Videos: `hideThreshold` (0-100, default `20`; `0` = Off) + per-surface `hideHomeEnabled`/`hideChannelEnabled`/`hideSearchEnabled`/`hideSubsEnabled`/`hideCorrEnabled` (default `true`).
- Minimum Views Filter: `viewsHideThreshold` (default `1000`; `0` = Off) + per-surface `viewsHide{Home,Channel,Search,Subs,Corr}Enabled` (default `true`).
- `hideShortsEnabled` + `hideShortsSearchEnabled` (default `true`): Shorts hiding, with search results carved out as a separate flag. Shorts are always filtered regardless of the Channel Whitelist.
- `hideMixesEnabled`, `hidePlaylistsEnabled`, `hideLivesEnabled` (default `true`): independent single toggles, gated by `isCoreFilterPath`.
- Upload Date Filter: `dateFilterNewerThreshold`/`dateFilterOlderThreshold` (days; `0` = Off) + per-surface `dateFilter{Home,Channel,Search,Subs,Corr}Enabled`, which **default to `false`** (unlike every other filter's per-surface flags) since the thresholds themselves already default to Off.
- `dimMode` (default `false`): global switch between hard hide (`display:none`) and dim-with-badge-overlay, applied uniformly across every filter above. There is no per-filter hide-vs-dim choice.
- Channel Whitelist: `channelWhitelist` (array of lowercase `/@handle` or `/channel/id` strings) + `channelWhitelistEnabled` (default `true`, acts as a pause switch for the whole list rather than clearing it).
- `floatingButtonEnabled` (default `true`) + `floatingButtonPosition` (`{ edge, offset }`, `local` storage).
- `hideInterfaceElements` (default `false`, popup label "Hide on-page controls"): hides the floating button and both whitelist button variants, without pausing any actual filtering.
- `tutorialCompleted` (default `false`): gates the first-run welcome card + spotlight tour.

`FILTER_REAPPLY_KEYS` / `WHITELIST_REAPPLY_KEYS` in `content/state.js` decide which pref changes trigger a full re-filter pass (`resetAppliedFilters` + `startHiding`) via `chrome.storage.onChanged`. When adding a new setting that affects filtering, add its key there too, or a live change in the popup/FAB won't take effect until the next page load.

## Color tokens

- Panel/card background: `#222222` (FAB panel, toasts); `#1e1e1e` (tutorial card/tooltip).
- Border: `#3a3a3a` (panels/toasts), `#333` (tutorial).
- Text: `#ebebeb`/`#e0e0e0` primary, `#aaa`/`#888` secondary.
- Blue accent: `#8ab4f8` (active-state ring on the FAB, focus outlines, info-icon tooltips); whitelisted-state blue `#065fd4` (light) / `#bcd6ff` on `#1b3a63` (dark theme).
- Green accent: `#10b981` (tutorial CTA buttons, spotlight highlights). A different, more saturated green (`#008000`) is used only for the toolbar badge background when a filter is active, with `#808080` when everything is off. Don't conflate the two.

## Versioning rule (mandatory)

Every change must bump `manifest.json`'s `"version"` (also mirrored in `package.json`) using semver, and add a matching entry to `CHANGELOG.md`:

- **PATCH** (`x.y.Z`): bug fix, no behavior change for users.
- **MINOR** (`x.Y.0`): new feature or non-breaking enhancement.
- **MAJOR** (`X.0.0`): breaking change (removed/renamed setting, changed default behavior, permission removal, etc).

`background.js` compares the manifest's minor version segment against the previously installed one on update to decide whether to show the "what's new" toast. An update that only bumps PATCH intentionally skips that toast, so don't bump MINOR just to trigger it.

## Documentation rule (mandatory)

Whenever a change affects the content-script load order, the settings (`prefs`/`defaultSettings`), permissions, or user-facing behavior, update in the same change:

- This `CLAUDE.md` (especially **File layout**, **Content scripts**, and **Settings**).
- `README.md` (its **Features**, **Settings**, and **Project Structure** sections).
- `docs/` (the marketing site for youtubehider.com): `index.html` for feature descriptions and screenshots, `welcome.html` for the first-install page `background.js` opens on install. Check whether copy, screenshots, or feature claims there are now stale.
- `content/tutorial.js` (the first-run welcome card + spotlight tour over the floating button and mini-panel): if the change adds, removes, renames, or repositions something the tour points at or describes, update the relevant step.

Treat stale documentation as a bug. Do not leave structural or behavioral changes undocumented. This rule covers docs specifically; also check the **Testing rule** (does `tests/parsers.test.js` need a new case, or is manual browser verification required) and the **Versioning rule** (version bump + CHANGELOG entry) for every change, since those are the other two recurring checks a change needs before it's done.
