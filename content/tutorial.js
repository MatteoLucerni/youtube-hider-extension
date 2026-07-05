// ─── Tutorial: Welcome Card & Spotlight Tour ────────────────────────────────
let tutorialOverlay = null;
let tutorialActive = false;
let tutorialSkipInterval = null;
let tourHost = null;
let tourBlocker = null;

function getTutorialCSS() {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    .yh-tutorial-overlay {
      position: fixed; inset: 0; z-index: 2147483647;
      background: rgba(0,0,0,0.7);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      transition: opacity 0.3s ease;
    }
    .yh-welcome-card {
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      background: #1e1e1e; border: 1px solid #333; border-radius: 12px;
      padding: 32px 28px 24px; width: 380px; max-width: 90vw;
      text-align: center; color: #e0e0e0;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6);
    }
    .yh-welcome-logo { width: 48px; height: 48px; margin-bottom: 16px; }
    .yh-welcome-title {
      font-size: 20px; font-weight: 700; margin-bottom: 8px;
      background: linear-gradient(135deg, #10b981, #3b82f6);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .yh-welcome-desc { font-size: 13px; line-height: 1.6; color: #aaa; margin-bottom: 24px; }
    .yh-welcome-actions { display: flex; gap: 12px; justify-content: center; }
    .yh-welcome-btn {
      padding: 10px 24px; border-radius: 8px; font-size: 13px; font-weight: 600;
      cursor: pointer; border: none; transition: all 0.2s ease;
    }
    .yh-welcome-btn-start {
      background: #10b981; color: #fff;
    }
    .yh-welcome-btn-start:hover { background: #0d9668; }
    .yh-welcome-btn-skip {
      background: #333; color: #888; border: 1px solid #444;
    }
    .yh-welcome-btn-skip:not(:disabled):hover { background: #444; color: #ccc; }
    .yh-welcome-btn-skip:disabled { opacity: 0.5; cursor: not-allowed; }
    .yh-spotlight-hole {
      position: fixed; z-index: 2147483647;
      border-radius: 8px;
      box-shadow: 0 0 0 9999px rgba(0,0,0,0.7);
      transition: all 0.4s ease;
      pointer-events: none;
    }
    .yh-spotlight-tooltip {
      position: fixed; z-index: 2147483647;
      background: #1e1e1e; border: 1px solid #333; border-radius: 10px;
      padding: 20px; width: 320px; max-width: 90vw;
      color: #e0e0e0;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      transition: all 0.4s ease;
    }
    .yh-spot-step-badge {
      display: inline-block; font-size: 11px; font-weight: 600;
      color: #10b981; background: rgba(16,185,129,0.12);
      padding: 2px 10px; border-radius: 20px; margin-bottom: 10px;
    }
    .yh-spot-title { font-size: 15px; font-weight: 700; margin-bottom: 6px; color: #f0f0f0; }
    .yh-spot-desc { font-size: 12.5px; line-height: 1.6; color: #aaa; margin-bottom: 16px; }
    .yh-spot-footer { display: flex; align-items: center; justify-content: space-between; }
    .yh-spot-dots { display: flex; gap: 6px; }
    .yh-spot-dot {
      width: 7px; height: 7px; border-radius: 50%; background: #444;
      transition: background 0.2s ease;
    }
    .yh-spot-dot.active { background: #10b981; }
    .yh-spot-btns { display: flex; gap: 8px; }
    .yh-spot-btn {
      padding: 7px 16px; border-radius: 6px; font-size: 12px; font-weight: 600;
      cursor: pointer; border: none; transition: all 0.2s ease;
    }
    .yh-spot-btn-back { background: #333; color: #aaa; }
    .yh-spot-btn-back:hover { background: #444; color: #ddd; }
    .yh-spot-btn-next { background: #10b981; color: #fff; }
    .yh-spot-btn-next:hover { background: #0d9668; }
  `;
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

  const overlay = document.createElement('div');
  overlay.className = 'yh-tutorial-overlay';

  const card = document.createElement('div');
  card.className = 'yh-welcome-card';

  const logo = document.createElement('img');
  logo.src = chrome.runtime.getURL('assets/icons/youtube-hider-logo.png');
  logo.className = 'yh-welcome-logo';

  const title = document.createElement('div');
  title.className = 'yh-welcome-title';
  title.textContent = 'Welcome to Youtube Hider!';

  const desc = document.createElement('div');
  desc.className = 'yh-welcome-desc';
  desc.textContent =
    "Take a quick tour to discover the Youtube Hider button built into YouTube's own header, your settings, and how to get the most out of the extension.";

  const actions = document.createElement('div');
  actions.className = 'yh-welcome-actions';

  const startBtn = document.createElement('button');
  startBtn.className = 'yh-welcome-btn yh-welcome-btn-start';
  startBtn.textContent = 'Start Tutorial';

  const skipBtn = document.createElement('button');
  skipBtn.className = 'yh-welcome-btn yh-welcome-btn-skip';
  skipBtn.disabled = true;
  let skipCountdown = 5;
  skipBtn.textContent = `Skip (${skipCountdown}s)`;
  tutorialSkipInterval = setInterval(() => {
    skipCountdown--;
    if (skipCountdown <= 0) {
      clearInterval(tutorialSkipInterval);
      tutorialSkipInterval = null;
      skipBtn.textContent = 'Skip';
      skipBtn.disabled = false;
    } else {
      skipBtn.textContent = `Skip (${skipCountdown}s)`;
    }
  }, 1000);

  startBtn.addEventListener('click', () => {
    clearInterval(tutorialSkipInterval);
    tutorialSkipInterval = null;
    removeTutorialOverlay();
    startSpotlightTour();
  });

  skipBtn.addEventListener('click', () => {
    if (skipBtn.disabled) return;
    clearInterval(tutorialSkipInterval);
    tutorialSkipInterval = null;
    prefs.tutorialCompleted = true;
    safeStorageSet('sync', { tutorialCompleted: true });
    removeTutorialOverlay();
  });

  actions.appendChild(startBtn);
  actions.appendChild(skipBtn);
  card.appendChild(logo);
  card.appendChild(title);
  card.appendChild(desc);
  card.appendChild(actions);
  overlay.appendChild(card);
  shadow.appendChild(overlay);

  document.body.appendChild(tutorialOverlay);
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
  if (tourHost) {
    tourHost.remove();
    tourHost = null;
  }
  if (tourBlocker) {
    tourBlocker.remove();
    tourBlocker = null;
  }
}

function removeTutorialOverlay() {
  if (tutorialSkipInterval) {
    clearInterval(tutorialSkipInterval);
    tutorialSkipInterval = null;
  }
  if (tutorialOverlay) {
    tutorialOverlay.remove();
    tutorialOverlay = null;
  }
}

function startSpotlightTour() {
  if (!headerButtonHost || !headerButtonElement) {
    prefs.tutorialCompleted = true;
    safeStorageSet('sync', { tutorialCompleted: true });
    return;
  }

  tutorialActive = true;

  const steps = [
    {
      title: 'Your Settings Button',
      desc: "This is the Youtube Hider button, built right into YouTube's own header. It appears on every page, including Watch, and opens instantly.",
      getTarget: () => headerButtonElement,
      onEnter: () => {
        if (headerDropdownOpen) closeHeaderDropdown();
      },
    },
    {
      title: 'Your Full Settings, Right Here',
      desc: 'Clicking it opens your complete Youtube Hider settings: Hide Watched Videos, Shorts, Mixes, Playlists and Lives, Minimum Views, Upload Date Filter, Filter Mode, Channel Whitelist, and the Simple/Advanced interface mode, all in one place.',
      getRect: () => getHeaderDropdownRect(),
      onEnter: () => {
        if (!headerDropdownOpen) openHeaderDropdown();
        setHeaderDropdownInteractive(false);
      },
    },
    {
      title: 'Tidy It Away Anytime',
      desc: '"Hide on-page controls" removes this button (and the inline whitelist buttons on video pages) if you\'d rather not see them. Its own dedicated toggle, right next to it, lets you hide just the button while keeping everything else visible.',
      getRect: () => getHeaderDropdownRect(),
      onEnter: () => {
        if (!headerDropdownOpen) openHeaderDropdown();
        setHeaderDropdownInteractive(false);
      },
    },
  ];

  let currentStep = 0;
  let hole = null;
  let tooltip = null;
  let tourShadow = null;

  function createTourElements() {
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
    Object.assign(tourHost.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '2147483647',
      pointerEvents: 'none',
    });
    tourShadow = tourHost.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = getTutorialCSS();
    tourShadow.appendChild(style);

    hole = document.createElement('div');
    hole.className = 'yh-spotlight-hole';
    tourShadow.appendChild(hole);

    tooltip = document.createElement('div');
    tooltip.className = 'yh-spotlight-tooltip';
    tooltip.style.pointerEvents = 'auto';
    tourShadow.appendChild(tooltip);

    document.body.appendChild(tourHost);
  }

  function computeTargetRect(step) {
    if (step.getRect) {
      const r = step.getRect();
      if (r) return { top: r.top, left: r.left, width: r.width, height: r.height };
      return { top: 100, left: 100, width: 40, height: 40 };
    }
    const el = step.getTarget ? step.getTarget() : null;
    if (!el) return { top: 100, left: 100, width: 40, height: 40 };
    const r = el.getBoundingClientRect();
    return { top: r.top, left: r.left, width: r.width, height: r.height };
  }

  function positionTooltip(rect) {
    const PADDING = 12;
    const tooltipW = 320;
    const tooltipH = tooltip.offsetHeight || 180;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top, left;
    const spaceBelow = vh - (rect.top + rect.height + PADDING);
    const spaceAbove = rect.top - PADDING;

    if (spaceBelow >= tooltipH + PADDING) {
      top = rect.top + rect.height + PADDING;
    } else if (spaceAbove >= tooltipH + PADDING) {
      top = rect.top - tooltipH - PADDING;
    } else {
      top = Math.max(PADDING, Math.min(vh - tooltipH - PADDING, rect.top));
    }

    const centerX = rect.left + rect.width / 2;
    left = centerX - tooltipW / 2;
    left = Math.max(PADDING, Math.min(vw - tooltipW - PADDING, left));

    tooltip.style.top = top + 'px';
    tooltip.style.left = left + 'px';
    tooltip.style.width = tooltipW + 'px';
  }

  function measureAndPosition(step) {
    const PAD = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = computeTargetRect(step);

    rect.top = Math.max(0, Math.min(rect.top, vh - rect.height));
    rect.left = Math.max(0, Math.min(rect.left, vw - rect.width));

    hole.style.top = rect.top - PAD + 'px';
    hole.style.left = rect.left - PAD + 'px';
    hole.style.width = rect.width + PAD * 2 + 'px';
    hole.style.height = rect.height + PAD * 2 + 'px';

    const dotsHTML = steps
      .map(
        (_, i) =>
          `<div class="yh-spot-dot${i === currentStep ? ' active' : ''}"></div>`,
      )
      .join('');

    const backBtn =
      currentStep > 0
        ? `<button class="yh-spot-btn yh-spot-btn-back" id="yh-tour-back">Back</button>`
        : '';
    const nextLabel = currentStep === steps.length - 1 ? 'Done' : 'Next';

    tooltip.innerHTML = `
      <div class="yh-spot-step-badge">Step ${currentStep + 1} of ${steps.length}</div>
      <div class="yh-spot-title">${step.title}</div>
      <div class="yh-spot-desc">${step.desc}</div>
      <div class="yh-spot-footer">
        <div class="yh-spot-dots">${dotsHTML}</div>
        <div class="yh-spot-btns">
          ${backBtn}
          <button class="yh-spot-btn yh-spot-btn-next" id="yh-tour-next">${nextLabel}</button>
        </div>
      </div>
    `;

    positionTooltip(rect);

    const nextEl = tourShadow.querySelector('#yh-tour-next');
    const backEl = tourShadow.querySelector('#yh-tour-back');

    nextEl.addEventListener('click', () => {
      if (currentStep < steps.length - 1) {
        currentStep++;
        renderStep();
      } else {
        finishTour();
      }
    });

    if (backEl) {
      backEl.addEventListener('click', () => {
        if (currentStep > 0) {
          currentStep--;
          renderStep();
        }
      });
    }
  }

  async function renderStep() {
    const step = steps[currentStep];
    const wasDropdownOpen = headerDropdownOpen;
    step.onEnter();
    const justOpened = !wasDropdownOpen && headerDropdownOpen;

    if (justOpened) {
      await waitForHeaderDropdownReady();
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        measureAndPosition(step);
      });
    });
  }

  function finishTour() {
    tutorialActive = false;
    prefs.tutorialCompleted = true;
    safeStorageSet('sync', { tutorialCompleted: true });

    setHeaderButtonInteractive(true);
    if (headerDropdownOpen) {
      setHeaderDropdownInteractive(true);
      closeHeaderDropdown();
    }

    if (tourHost) {
      tourHost.remove();
      tourHost = null;
    }
    if (tourBlocker) {
      tourBlocker.remove();
      tourBlocker = null;
    }
  }

  createTourElements();
  renderStep();
}
