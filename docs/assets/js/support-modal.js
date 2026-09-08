(function () {
  const KOFI_LINK = "https://ko-fi.com/D5Y424F3EB";
  const GITHUB_LINK = "https://github.com/MatteoLucerni/youtube-hider-extension";
  const REVIEW_LINK =
    "https://chromewebstore.google.com/detail/ebpikpmmnpjmlcpanakfcgchkdjaanmm/reviews";

  const css = `
    .yh-support-trigger {
      display: inline-flex; align-items: center; gap: 8px;
      background: rgba(138, 180, 248, 0.14); color: #8ab4f8;
      border: 1px solid rgba(138, 180, 248, 0.28); border-radius: 8px;
      padding: 8px 16px; font-weight: 600; font-family: inherit; font-size: inherit;
      text-decoration: none; cursor: pointer;
      transition: background .2s cubic-bezier(.4,0,.2,1), border-color .2s cubic-bezier(.4,0,.2,1), transform .2s cubic-bezier(.4,0,.2,1);
    }
    .yh-support-trigger:hover {
      background: rgba(138, 180, 248, 0.22); border-color: rgba(138, 180, 248, 0.5);
      color: #8ab4f8; transform: translateY(-2px);
    }
    .yh-support-trigger:focus-visible { outline: 2px solid #8ab4f8; outline-offset: 2px; }

    .yh-support-modal {
      position: fixed; inset: 0; z-index: 100000; display: flex;
      align-items: center; justify-content: center; padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    .yh-support-modal[hidden] { display: none; }

    .yh-support-scrim {
      position: absolute; inset: 0; background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(3px); animation: yhSupportFade .16s cubic-bezier(.4,0,.2,1);
    }

    .yh-support-card {
      position: relative; width: 100%; max-width: 420px; max-height: 100%;
      overflow-y: auto; overscroll-behavior: contain; padding: 28px;
      background:
        radial-gradient(600px 300px at 20% -10%, rgba(138, 180, 248, 0.10), transparent 70%),
        #242424;
      border: 1px solid #3a3a3a; border-radius: 8px;
      box-shadow: 0 0 0 1px rgba(255,255,255,.05), 0 2px 8px rgba(0,0,0,.25), 0 24px 60px rgba(0,0,0,.5);
      animation: yhSupportIn .18s cubic-bezier(.4,0,.2,1);
    }

    @keyframes yhSupportFade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes yhSupportIn {
      from { opacity: 0; transform: translateY(10px) scale(.98); }
      to { opacity: 1; transform: none; }
    }

    .yh-support-head {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 12px; margin-bottom: 16px;
    }
    .yh-support-title {
      margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.3px; color: #ebebeb;
    }
    .yh-support-close {
      display: flex; align-items: center; justify-content: center;
      width: 30px; height: 30px; flex-shrink: 0; padding: 0;
      color: #888888; background: #2a2a2a; border: 1px solid #3a3a3a;
      border-radius: 8px; cursor: pointer;
      transition: color .2s, background .2s, border-color .2s;
    }
    .yh-support-close:hover { color: #ebebeb; background: #313131; border-color: #4a4a4a; }
    .yh-support-close:focus-visible { outline: 2px solid #8ab4f8; outline-offset: 2px; }
    .yh-support-close svg { width: 15px; height: 15px; }

    .yh-support-text {
      margin: 0 0 16px; font-size: 13.5px; line-height: 1.6; color: #b8b8b8;
    }
    .yh-support-text.yh-lead { color: #ebebeb; }

    .yh-support-options { display: flex; flex-direction: column; gap: 10px; }

    .yh-support-option {
      display: flex; align-items: center; gap: 14px; padding: 14px 16px;
      background: #2a2a2a; border: 1px solid #4a4a4a; border-radius: 8px;
      box-shadow: 0 1px 2px rgba(0,0,0,.22), 0 2px 5px rgba(0,0,0,.2);
      text-decoration: none; color: #ebebeb;
      transition: background .2s cubic-bezier(.4,0,.2,1), border-color .2s cubic-bezier(.4,0,.2,1), transform .15s cubic-bezier(.4,0,.2,1), box-shadow .2s cubic-bezier(.4,0,.2,1);
    }
    .yh-support-option:hover {
      background: #313131; transform: translateY(-1px);
      box-shadow: 0 4px 14px rgba(0,0,0,.32); color: #ebebeb;
    }
    .yh-support-option:focus-visible { outline: 2px solid #8ab4f8; outline-offset: 2px; }

    .yh-support-icon {
      display: flex; align-items: center; justify-content: center;
      width: 36px; height: 36px; min-width: 36px; border-radius: 8px;
      color: #8ab4f8; background: rgba(138, 180, 248, 0.16);
      border: 1px solid rgba(138, 180, 248, 0.3);
      transition: background .2s, border-color .2s;
    }
    .yh-support-icon svg { width: 17px; height: 17px; }

    .yh-support-option.yh-coffee .yh-support-icon {
      color: #10b981; background: rgba(16, 185, 129, 0.16); border-color: rgba(16, 185, 129, 0.3);
    }
    .yh-support-option.yh-coffee:hover { border-color: rgba(16, 185, 129, 0.6); }
    .yh-support-option.yh-github:hover { border-color: rgba(138, 180, 248, 0.6); }
    .yh-support-option.yh-review .yh-support-icon {
      color: #fbbf24; background: rgba(251, 191, 36, 0.16); border-color: rgba(251, 191, 36, 0.3);
    }
    .yh-support-option.yh-review:hover { border-color: rgba(251, 191, 36, 0.6); }

    .yh-support-body { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
    .yh-support-name { font-size: 14px; font-weight: 600; color: #ebebeb; line-height: 1.3; }
    .yh-support-desc { font-size: 12px; line-height: 1.45; color: #b8b8b8; }

    .yh-support-arrow {
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      color: #888888; transition: color .2s, transform .2s;
    }
    .yh-support-arrow svg { width: 15px; height: 15px; }
    .yh-support-option:hover .yh-support-arrow { color: #ebebeb; transform: translate(2px, -2px); }

    @media (max-height: 560px) {
      .yh-support-modal { padding: 12px; }
      .yh-support-card { padding: 18px; }
      .yh-support-text { margin-bottom: 12px; }
      .yh-support-option { padding: 11px 14px; }
    }

    @media (prefers-reduced-motion: reduce) {
      .yh-support-scrim, .yh-support-card { animation: none; }
      .yh-support-option:hover .yh-support-arrow { transform: none; }
    }
  `;

  const arrow =
    '<span class="yh-support-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M7 17 17 7M9 7h8v8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';

  const iconCoffee =
    '<svg viewBox="0 0 24 24" fill="none"><path d="M2 8h15a3 3 0 0 1 0 6h-1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 8v9a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 2c-.5 1 -1.5 1.5 -1 3M10 2c-.5 1 -1.5 1.5 -1 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const iconGithub =
    '<svg viewBox="0 0 24 24" fill="none"><path d="m8 18-6-6 6-6M16 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const iconStar =
    '<svg viewBox="0 0 24 24" fill="none"><path d="m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L2.6 9.8l6.5-.9z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const options = [
    {
      cls: "yh-coffee",
      icon: iconCoffee,
      link: KOFI_LINK,
      name: "Buy me a coffee",
      desc: "A one-off contribution on Ko-fi. No account and no subscription needed.",
    },
    {
      cls: "yh-github",
      icon: iconGithub,
      link: GITHUB_LINK,
      name: "Contribute on GitHub",
      desc: "Send a pull request, or report a broken filter with the page it happened on.",
    },
    {
      cls: "yh-review",
      icon: iconStar,
      link: REVIEW_LINK,
      name: "Leave a review",
      desc: "A rating on the Chrome Web Store costs nothing and helps other people find it.",
    },
  ];

  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const modal = document.createElement("div");
  modal.className = "yh-support-modal";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="yh-support-scrim" data-support-close></div>
    <div class="yh-support-card" role="dialog" aria-modal="true" aria-labelledby="yh-support-title">
      <div class="yh-support-head">
        <h2 class="yh-support-title" id="yh-support-title">Support YouTube Hider</h2>
        <button type="button" class="yh-support-close" data-support-close aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
        </button>
      </div>
      <p class="yh-support-text yh-lead">
        YouTube Hider is free, open source, and has no ads and no tracking. It
        also aims at a moving target: YouTube reshapes its page markup without
        warning, and a change nobody announces can quietly break a filter that
        worked yesterday.
      </p>
      <p class="yh-support-text">
        Keeping it working means hunting those changes down one selector at a
        time, in someone's spare time. Any of these three helps.
      </p>
      <div class="yh-support-options">
        ${options
          .map(
            o => `
        <a class="yh-support-option ${o.cls}" href="${o.link}" target="_blank" rel="noopener noreferrer">
          <span class="yh-support-icon" aria-hidden="true">${o.icon}</span>
          <span class="yh-support-body">
            <span class="yh-support-name">${o.name}</span>
            <span class="yh-support-desc">${o.desc}</span>
          </span>
          ${arrow}
        </a>`
          )
          .join("")}
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  let lastTrigger = null;

  function open(trigger) {
    lastTrigger = trigger || null;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    const close = modal.querySelector(".yh-support-close");
    if (close) close.focus();
  }

  function close() {
    if (modal.hidden) return;
    modal.hidden = true;
    document.body.style.overflow = "";
    if (lastTrigger && typeof lastTrigger.focus === "function") lastTrigger.focus();
  }

  modal.addEventListener("click", e => {
    if (e.target.closest("[data-support-close]")) close();
    else if (e.target.closest(".yh-support-option")) close();
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") close();
  });

  document.addEventListener("click", e => {
    const trigger = e.target.closest("[data-support-open]");
    if (!trigger) return;
    e.preventDefault();
    open(trigger);
  });
})();
