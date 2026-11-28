let tutorialOverlay = null;
let tutorialActive = false;
let tourHost = null;
let tourBlocker = null;
let tourKeydownHandler = null;
let tourRepositionHandler = null;
let tourMessageHandler = null;

const TOUR_EDGE = 16;
const TOUR_GAP = 12;
const TOUR_CARD_WIDTH = 320;
const TOUR_WIDE_MIN = 720;

function getTutorialCSS() {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    :host { all: initial; }
    .yh-scrim {
      position: fixed; inset: 0; z-index: 2147483647;
      display: flex; align-items: center; justify-content: center;
      padding: 16px;
      background: rgba(0, 0, 0, 0.62);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .yh-card {
      position: relative;
      display: flex; flex-direction: column; gap: 10px;
      padding: 16px;
      max-height: calc(100vh - 32px);
      overflow-y: auto;
      color: #ebebeb;
      background: #1e1e1e;
      border: 1px solid #333333;
      border-radius: 8px;
      box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.05), 0 2px 8px rgba(0, 0, 0, 0.25), 0 10px 30px rgba(0, 0, 0, 0.35);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      line-height: 1.5;
      overflow-wrap: break-word;
      hyphens: auto;
      animation: yh-card-in 160ms ease-out;
    }
    .yh-welcome {
      width: 100%; max-width: 400px;
      padding: 24px;
      align-items: center; gap: 12px;
      text-align: center;
    }
    .yh-welcome-logo { width: 72px; height: 72px; }
    .yh-welcome-title { font-size: 20px; font-weight: 700; letter-spacing: -0.3px; line-height: 1.3; color: #ffffff; }
    .yh-welcome-desc { max-width: 320px; font-size: 14px; color: #b8b8b8; }
    .yh-welcome-actions { width: 100%; display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    .yh-welcome-actions .yh-btn { flex: 1 1 120px; min-height: 40px; }
    .yh-welcome-note { font-size: 12px; color: #b8b8b8; }
    .yh-close {
      flex-shrink: 0;
      width: 32px; height: 32px;
      display: flex; align-items: center; justify-content: center;
      color: #b8b8b8; background: transparent;
      border: none; border-radius: 8px;
      cursor: pointer;
    }
    .yh-close:hover { color: #ffffff; background: #2a2a2a; }
    .yh-welcome .yh-close { position: absolute; top: 8px; right: 8px; }
    .yh-step-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .yh-step-head .yh-close { margin: -8px -8px -8px 0; }
    .yh-step-meta { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #b8b8b8; }
    .yh-progress { display: flex; gap: 3px; }
    .yh-progress span { width: 16px; height: 4px; border-radius: 2px; background: #3a3a3a; }
    .yh-progress span.is-done { background: #10b981; }
    .yh-step-title { font-size: 16px; font-weight: 600; line-height: 1.35; color: #ffffff; }
    .yh-step-body { font-size: 13px; color: #b8b8b8; }
    .yh-step-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 2px; }
    .yh-step-actions.has-back { justify-content: space-between; }
    .yh-btn {
      min-height: 36px; padding: 0 16px;
      font-family: inherit; font-size: 13px; font-weight: 500;
      border-radius: 8px;
      cursor: pointer;
      white-space: nowrap;
    }
    .yh-btn-quiet { color: #ebebeb; background: #2a2a2a; border: 1px solid #3a3a3a; }
    .yh-btn-quiet:hover { background: #313131; }
    .yh-btn-primary { font-weight: 600; color: #0e1117; background: #10b981; border: none; }
    .yh-btn-primary:hover { background: #34d399; }
    .yh-btn:focus-visible, .yh-close:focus-visible, .yh-target-hit:focus-visible { outline: 2px solid #8ab4f8; outline-offset: 2px; }
    .yh-popover { position: fixed; z-index: 2147483647; width: ${TOUR_CARD_WIDTH}px; max-width: calc(100vw - 32px); }
    .yh-sheet { position: fixed; z-index: 2147483647; left: 8px; right: 8px; width: auto; }
    .yh-sheet.is-bottom { bottom: 8px; }
    .yh-sheet.is-top { top: 8px; }
    .yh-center { position: fixed; z-index: 2147483647; left: 50%; top: 50%; transform: translate(-50%, -50%); width: calc(100vw - 32px); max-width: 400px; }
    .yh-arrow {
      position: fixed; z-index: 2147483647;
      width: 12px; height: 12px;
      background: #1e1e1e;
      border-left: 1px solid #333333; border-top: 1px solid #333333;
    }
    .yh-arrow.is-up { transform: rotate(45deg); }
    .yh-arrow.is-down { transform: rotate(225deg); }
    .yh-arrow.is-left { transform: rotate(-45deg); }
    .yh-arrow.is-right { transform: rotate(135deg); }
    .yh-arrow[hidden] { display: none; }
    .yh-highlight {
      position: fixed; z-index: 2147483646;
      border-radius: 8px;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.62);
      pointer-events: none;
      transition: top 0.25s ease, left 0.25s ease, width 0.25s ease, height 0.25s ease;
    }
    .yh-highlight.has-ring { border: 2px solid #10b981; }
    .yh-highlight.is-full { inset: 0; border-radius: 0; box-shadow: none; background: rgba(0, 0, 0, 0.62); }
    .yh-target-hit {
      position: fixed; z-index: 2147483647;
      border-radius: 50%;
      background: transparent;
      border: none;
      cursor: pointer;
    }
    .yh-illustration {
      display: flex; gap: 12px; align-items: center;
      padding: 12px;
      background: #151515;
      border: 1px solid #333333;
      border-radius: 8px;
    }
    .yh-thumb { position: relative; flex: 0 0 168px; aspect-ratio: 16 / 9; border-radius: 8px; background: #2e2e2e; overflow: hidden; }
    .yh-thumb-pills { position: absolute; top: 8px; left: 0; right: 0; display: flex; justify-content: center; gap: 4px; }
    .yh-pill {
      display: inline-flex; align-items: center;
      height: 22px; padding: 0 9px;
      font-family: Roboto, Arial, sans-serif; font-size: 11px; font-weight: 500; line-height: 1;
      color: #ffffff; background: rgba(0, 0, 0, 0.8);
      border-radius: 11px;
      white-space: nowrap;
    }
    .yh-thumb-cursor { position: absolute; left: 57%; top: 58%; }
    .yh-lines { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
    .yh-lines span { height: 8px; border-radius: 4px; background: #2e2e2e; }
    @media (max-width: 420px) {
      .yh-thumb { flex-basis: 100%; }
      .yh-lines { display: none; }
    }
    @keyframes yh-card-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
    .yh-center { animation-name: yh-center-in; }
    @keyframes yh-center-in { from { opacity: 0; } to { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) {
      .yh-card, .yh-center { animation: none; }
      .yh-highlight { transition: none; }
    }
  `;
}

const TOUR_CLOSE_ICON =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

const TOUR_CURSOR_ICON =
  '<svg class="yh-thumb-cursor" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3l13 8-6 1.5L9 19z" fill="#ffffff" stroke="#0f0f0f" stroke-width="1.2" stroke-linejoin="round"/></svg>';

function createTourElement(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function createTourButton(className, text, onClick) {
  const button = createTourElement('button', className, text);
  button.type = 'button';
  button.addEventListener('click', onClick);
  return button;
}

function createTourCloseButton(onClick) {
  const button = createTourButton('yh-close', undefined, onClick);
  button.innerHTML = TOUR_CLOSE_ICON;
  button.setAttribute('aria-label', getText('tourSkipLabel'));
  button.title = getText('tourSkipLabel');
  return button;
}

function getTourFocusable(root) {
  return Array.from(root.querySelectorAll('button')).filter(el => !el.disabled);
}

function trapTourFocus(event, root) {
  if (event.key !== 'Tab') return;
  const focusable = getTourFocusable(root);
  if (!focusable.length) return;
  const active = root.getRootNode().activeElement;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && (active === first || !root.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !root.contains(active))) {
    event.preventDefault();
    first.focus();
  }
}

function markTutorialAnswered() {
  prefs.tutorialCompleted = true;
  safeStorageSet('sync', { tutorialCompleted: true });
}

function showTutorialWelcomeCard() {
  if (tutorialOverlay) return;
  if (prefs.tutorialCompleted) return;

  tutorialOverlay = document.createElement('div');
  tutorialOverlay.id = 'yh-tutorial-host';
  const shadow = tutorialOverlay.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = getTutorialCSS();
  shadow.appendChild(style);

  const scrim = createTourElement('div', 'yh-scrim');
  const card = createTourElement('section', 'yh-card yh-welcome');
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.setAttribute('aria-labelledby', 'yh-welcome-title');

  const skip = () => {
    markTutorialAnswered();
    removeTutorialOverlay();
  };

  const logo = createTourElement('img', 'yh-welcome-logo');
  logo.src = chrome.runtime.getURL('assets/icons/youtube-hider-logo.png');
  logo.alt = '';

  const title = createTourElement('h1', 'yh-welcome-title', getText('tourWelcomeTitle'));
  title.id = 'yh-welcome-title';

  const actions = createTourElement('div', 'yh-welcome-actions');
  actions.appendChild(createTourButton('yh-btn yh-btn-quiet', getText('tourNotNow'), skip));
  const start = createTourButton('yh-btn yh-btn-primary', getText('tourStart'), () => {
    removeTutorialOverlay();
    markTutorialAnswered();
    startSpotlightTour();
  });
  actions.appendChild(start);

  card.appendChild(createTourCloseButton(skip));
  card.appendChild(logo);
  card.appendChild(title);
  card.appendChild(createTourElement('p', 'yh-welcome-desc', getText('tourWelcomeDescription', formatLocaleNumber(4))));
  card.appendChild(actions);
  card.appendChild(createTourElement('p', 'yh-welcome-note', getText('tourRestartNote', getText('tabSettings'))));
  scrim.appendChild(card);
  shadow.appendChild(scrim);

  scrim.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      skip();
      return;
    }
    trapTourFocus(event, card);
  });

  document.body.appendChild(tutorialOverlay);
  start.focus();
}

function removeTutorialOverlay() {
  if (tutorialOverlay) {
    tutorialOverlay.remove();
    tutorialOverlay = null;
  }
}

function detachTourListeners() {
  if (tourKeydownHandler) {
    document.removeEventListener('keydown', tourKeydownHandler, true);
    tourKeydownHandler = null;
  }
  if (tourRepositionHandler) {
    window.removeEventListener('resize', tourRepositionHandler);
    window.removeEventListener('scroll', tourRepositionHandler, true);
    tourRepositionHandler = null;
  }
  if (tourMessageHandler) {
    window.removeEventListener('message', tourMessageHandler);
    tourMessageHandler = null;
  }
}

function cleanupTour() {
  if (tutorialActive) {
    tutorialActive = false;
    setHeaderButtonInteractive(true);
    if (headerDropdownOpen) {
      setHeaderDropdownInteractive(true);
      closeHeaderDropdown();
    }
  }
  detachTourListeners();
  if (tourHost) {
    tourHost.remove();
    tourHost = null;
  }
  if (tourBlocker) {
    tourBlocker.remove();
    tourBlocker = null;
  }
}

function placeTourCard(card, arrow, targetRect, avoidRect) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  card.className = 'yh-card';
  card.style.cssText = '';
  arrow.className = 'yh-arrow';
  arrow.hidden = true;

  if (!targetRect) {
    card.classList.add(vw >= TOUR_WIDE_MIN ? 'yh-center' : 'yh-sheet');
    if (vw < TOUR_WIDE_MIN) card.classList.add('is-bottom');
    return;
  }

  if (vw >= TOUR_WIDE_MIN) {
    card.classList.add('yh-popover');
    const width = card.offsetWidth;
    const height = card.offsetHeight;
    const centerX = targetRect.left + targetRect.width / 2;
    const centerY = targetRect.top + targetRect.height / 2;
    const clampX = value => Math.max(TOUR_EDGE, Math.min(vw - width - TOUR_EDGE, value));
    const clampY = value => Math.max(TOUR_EDGE, Math.min(vh - height - TOUR_EDGE, value));
    const outer = avoidRect || targetRect;
    const fits = {
      below: outer.bottom + TOUR_GAP + height + TOUR_EDGE <= vh,
      left: outer.left - TOUR_GAP - width - TOUR_EDGE >= 0,
      right: outer.right + TOUR_GAP + width + TOUR_EDGE <= vw,
      above: outer.top - TOUR_GAP - height - TOUR_EDGE >= 0,
    };
    const side = ['below', 'left', 'right', 'above'].find(name => fits[name]);
    if (side) {
      let left;
      let top;
      if (side === 'below' || side === 'above') {
        left = clampX(centerX - width / 2);
        top = side === 'below' ? outer.bottom + TOUR_GAP : outer.top - TOUR_GAP - height;
        arrow.classList.add(side === 'below' ? 'is-up' : 'is-down');
        arrow.style.left = left + Math.max(12, Math.min(width - 24, centerX - left - 6)) + 'px';
        arrow.style.top = (side === 'below' ? top - 6 : top + height - 6) + 'px';
      } else {
        top = clampY(centerY - height / 2);
        left = side === 'left' ? outer.left - TOUR_GAP - width : outer.right + TOUR_GAP;
        arrow.classList.add(side === 'left' ? 'is-right' : 'is-left');
        arrow.style.top = top + Math.max(12, Math.min(height - 24, centerY - top - 6)) + 'px';
        arrow.style.left = (side === 'left' ? left + width - 6 : left - 6) + 'px';
      }
      card.style.left = left + 'px';
      card.style.top = top + 'px';
      arrow.hidden = false;
      return;
    }
    card.classList.remove('yh-popover');
  }

  card.classList.add('yh-sheet', centerY(targetRect) > vh / 2 ? 'is-top' : 'is-bottom');
}

function centerY(rect) {
  return rect.top + rect.height / 2;
}

function startSpotlightTour() {
  if (!headerButtonHost || !headerButtonElement) {
    markTutorialAnswered();
    return;
  }

  tutorialActive = true;

  const watchedLabel = getText('buttonWatched');
  const blacklistLabel = getText('buttonBlacklist');

  const steps = [
    {
      title: getText('tourGearTitle'),
      body: getText('tourGearBody'),
      target: 'gear',
    },
    {
      title: getText('tourFiltersTitle'),
      body: getText('tourFiltersBody'),
      target: 'dropdown',
      section: 'filters',
    },
    {
      title: getText('tourListsTitle'),
      body: getText('tourListsBody', [getText('tabLists'), getText('markedWatchedManage')]),
      target: 'dropdown',
      section: 'channel',
    },
    {
      title: getText('tourVideoTitle'),
      body: getText('tourVideoBody', [watchedLabel, blacklistLabel, getText('hideOnPageControlsLabel'), getText('tabSettings')]),
      target: null,
      illustration: true,
    },
  ];

  let currentStep = 0;
  let sectionRect = null;
  let shadow = null;
  let highlight = null;
  let hit = null;
  let card = null;
  let arrow = null;

  tourBlocker = document.createElement('div');
  tourBlocker.id = 'yh-tour-blocker';
  Object.assign(tourBlocker.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '2147483645',
    pointerEvents: 'auto',
    background: 'transparent',
  });
  document.body.appendChild(tourBlocker);
  setHeaderButtonInteractive(false);

  tourHost = document.createElement('div');
  tourHost.id = 'yh-spotlight-host';
  Object.assign(tourHost.style, { position: 'fixed', inset: '0', zIndex: '2147483647', pointerEvents: 'none' });
  shadow = tourHost.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = getTutorialCSS();
  shadow.appendChild(style);

  highlight = createTourElement('div', 'yh-highlight');
  shadow.appendChild(highlight);

  hit = createTourButton('yh-target-hit', undefined, () => goTo(1));
  hit.setAttribute('aria-label', getText('headerButtonLabel'));
  hit.style.pointerEvents = 'auto';
  shadow.appendChild(hit);

  card = createTourElement('section', 'yh-card');
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-labelledby', 'yh-step-title');
  card.setAttribute('aria-describedby', 'yh-step-body');
  card.style.pointerEvents = 'auto';
  shadow.appendChild(card);

  arrow = createTourElement('span', 'yh-arrow');
  arrow.setAttribute('aria-hidden', 'true');
  arrow.hidden = true;
  shadow.appendChild(arrow);

  document.body.appendChild(tourHost);

  function finishTour() {
    markTutorialAnswered();
    cleanupTour();
  }

  function targetRectFor(step) {
    if (step.target === 'gear') {
      const r = headerButtonElement && headerButtonElement.getBoundingClientRect();
      return r ? { top: r.top, left: r.left, width: r.width, height: r.height, right: r.right, bottom: r.bottom } : null;
    }
    if (step.target === 'dropdown') {
      const r = getHeaderDropdownRect();
      if (!r) return null;
      if (sectionRect) {
        const top = r.top + sectionRect.top;
        const height = Math.min(sectionRect.height, r.bottom - top);
        return { top, left: r.left + sectionRect.left, width: sectionRect.width, height, right: r.left + sectionRect.left + sectionRect.width, bottom: top + height };
      }
      return { top: r.top, left: r.left, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
    }
    return null;
  }

  function buildCard(step) {
    card.textContent = '';
    const head = createTourElement('div', 'yh-step-head');
    const meta = createTourElement('div', 'yh-step-meta');
    meta.appendChild(createTourElement('span', '', getText('tourStepCount', [formatLocaleNumber(currentStep + 1), formatLocaleNumber(steps.length)])));
    const progress = createTourElement('span', 'yh-progress');
    progress.setAttribute('aria-hidden', 'true');
    steps.forEach((_, index) => progress.appendChild(createTourElement('span', index <= currentStep ? 'is-done' : '')));
    meta.appendChild(progress);
    head.appendChild(meta);
    head.appendChild(createTourCloseButton(finishTour));
    card.appendChild(head);

    if (step.illustration) {
      const art = createTourElement('div', 'yh-illustration');
      art.setAttribute('aria-hidden', 'true');
      const thumb = createTourElement('div', 'yh-thumb');
      const pills = createTourElement('div', 'yh-thumb-pills');
      pills.appendChild(createTourElement('span', 'yh-pill', watchedLabel));
      pills.appendChild(createTourElement('span', 'yh-pill', blacklistLabel));
      thumb.appendChild(pills);
      thumb.insertAdjacentHTML('beforeend', TOUR_CURSOR_ICON);
      const lines = createTourElement('div', 'yh-lines');
      ['95%', '70%', '45%'].forEach(width => {
        const line = createTourElement('span');
        line.style.width = width;
        lines.appendChild(line);
      });
      art.appendChild(thumb);
      art.appendChild(lines);
      card.appendChild(art);
    }

    const title = createTourElement('h2', 'yh-step-title', step.title);
    title.id = 'yh-step-title';
    const body = createTourElement('p', 'yh-step-body', step.body);
    body.id = 'yh-step-body';
    card.appendChild(title);
    card.appendChild(body);

    const actions = createTourElement('div', 'yh-step-actions');
    if (currentStep > 0) {
      actions.classList.add('has-back');
      actions.appendChild(createTourButton('yh-btn yh-btn-quiet', getText('tourBack'), () => goTo(currentStep - 1)));
    }
    const isLast = currentStep === steps.length - 1;
    const next = createTourButton('yh-btn yh-btn-primary', getText(isLast ? 'tourDone' : 'tourNext'), () => {
      if (isLast) finishTour();
      else goTo(currentStep + 1);
    });
    actions.appendChild(next);
    card.appendChild(actions);
    return next;
  }

  function layout() {
    const step = steps[currentStep];
    const rect = targetRectFor(step);
    highlight.className = 'yh-highlight';
    highlight.style.cssText = '';
    hit.hidden = true;
    if (!rect) {
      highlight.classList.add('is-full');
    } else if (step.target === 'gear') {
      const pad = 4;
      highlight.classList.add('has-ring');
      highlight.style.borderRadius = '50%';
      Object.assign(highlight.style, {
        top: rect.top - pad + 'px',
        left: rect.left - pad + 'px',
        width: rect.width + pad * 2 + 'px',
        height: rect.height + pad * 2 + 'px',
      });
      Object.assign(hit.style, {
        top: rect.top + 'px',
        left: rect.left + 'px',
        width: rect.width + 'px',
        height: rect.height + 'px',
      });
      hit.hidden = false;
    } else {
      const dropdown = getHeaderDropdownRect();
      if (dropdown) {
        Object.assign(highlight.style, {
          top: dropdown.top + 'px',
          left: dropdown.left + 'px',
          width: dropdown.width + 'px',
          height: dropdown.height + 'px',
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.62)',
          background: 'transparent',
        });
      }
    }
    placeTourCard(card, arrow, rect, step.target === 'dropdown' ? getHeaderDropdownRect() : null);
  }

  async function goTo(index) {
    currentStep = index;
    sectionRect = null;
    const step = steps[currentStep];
    if (step.target === 'dropdown') {
      const wasOpen = headerDropdownOpen;
      if (!wasOpen) openHeaderDropdown();
      setHeaderDropdownInteractive(false);
      if (!wasOpen) await waitForHeaderDropdownReady();
      if (!tutorialActive) return;
      sendMessageToHeaderDropdown({ type: 'YH_TOUR_HIGHLIGHT', section: step.section });
    } else if (headerDropdownOpen) {
      sendMessageToHeaderDropdown({ type: 'YH_TOUR_CLEAR' });
      setHeaderDropdownInteractive(true);
      closeHeaderDropdown();
    }
    const next = buildCard(step);
    requestAnimationFrame(() => {
      if (!tutorialActive) return;
      layout();
      next.focus({ preventScroll: true });
    });
  }

  tourKeydownHandler = event => {
    if (!tutorialActive) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      finishTour();
      return;
    }
    trapTourFocus(event, card);
  };
  document.addEventListener('keydown', tourKeydownHandler, true);

  let repositionFrame = 0;
  tourRepositionHandler = () => {
    if (repositionFrame) return;
    repositionFrame = requestAnimationFrame(() => {
      repositionFrame = 0;
      if (tutorialActive) layout();
    });
  };
  window.addEventListener('resize', tourRepositionHandler);
  window.addEventListener('scroll', tourRepositionHandler, true);

  const extensionOrigin = new URL(chrome.runtime.getURL('popup/popup.html')).origin;
  tourMessageHandler = event => {
    if (event.origin !== extensionOrigin) return;
    const data = event.data;
    if (!data || data.type !== 'YH_TOUR_TARGET_RECT' || !data.rect) return;
    const step = steps[currentStep];
    if (step.section !== data.section) return;
    sectionRect = data.rect;
    layout();
  };
  window.addEventListener('message', tourMessageHandler);

  goTo(0);
}
