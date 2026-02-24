(function () {
  const FORM_LINK = "https://forms.gle/oAqtSjQHQeEp9TFKA";
  const UNINSTALL_LINK = "https://forms.gle/EzdNzE2nWnSjcy2r9";

  const css = `
    .fb-widget { position: fixed; bottom: 24px; right: 24px; z-index: 99999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }

    .fb-widget-fab {
      width: 56px; height: 56px; border-radius: 50%; border: none; cursor: pointer;
      background: #5a8fd6; color: #fff; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 14px rgba(0,0,0,.25); transition: transform .2s, background .2s;
    }
    .fb-widget-fab:hover { transform: scale(1.08); }
    .fb-widget-fab svg { width: 26px; height: 26px; fill: currentColor; transition: transform .25s; }
    .fb-widget-fab.fb-open svg { transform: rotate(90deg); }

    .fb-widget-popup {
      position: absolute; bottom: 72px; right: 0; width: 340px;
      background: #fff; border-radius: 14px; box-shadow: 0 8px 30px rgba(0,0,0,.18);
      padding: 28px 24px 20px; opacity: 0; transform: translateY(16px) scale(.96);
      pointer-events: none; transition: opacity .25s, transform .25s;
    }
    .fb-widget-popup.fb-visible { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }

    .fb-widget-popup h3 { margin: 0 0 4px; font-size: 18px; font-weight: 700; color: #1a1a1a; }
    .fb-widget-popup p.fb-subtitle { margin: 0 0 18px; font-size: 13px; color: #666; line-height: 1.4; }

    .fb-widget-card {
      display: flex; align-items: center; gap: 14px; padding: 14px 16px;
      border: 1px solid #eee; border-radius: 10px; text-decoration: none;
      color: inherit; transition: border-color .2s, box-shadow .2s; margin-bottom: 10px;
    }
    .fb-widget-card:last-child { margin-bottom: 0; }
    .fb-widget-card:hover { border-color: #ccc; box-shadow: 0 2px 8px rgba(0,0,0,.06); }

    .fb-widget-icon {
      width: 42px; height: 42px; min-width: 42px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
    }
    .fb-widget-icon svg { width: 20px; height: 20px; }

    .fb-widget-icon.fb-star { background: #fef3c7; }
    .fb-widget-icon.fb-bug { background: #ffe5e5; }
    .fb-widget-icon.fb-feedback { background: #e0edff; }
    .fb-widget-icon.fb-uninstall { background: #f0f0f0; }

    .fb-widget-card-text { display: flex; flex-direction: column; }
    .fb-widget-card-text span { font-size: 14px; font-weight: 600; color: #1a1a1a; }
    .fb-widget-card-text small { font-size: 12px; color: #888; margin-top: 2px; }

    @media (max-width: 480px) {
      .fb-widget-popup { width: calc(100vw - 32px); right: -8px; }
    }
  `;

  const svgChat = '<svg viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/></svg>';
  const svgClose = '<svg viewBox="0 0 24 24"><path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 1 0 5.7 7.11L10.59 12 5.7 16.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z"/></svg>';

  const svgStar = '<svg viewBox="0 0 24 24" fill="#d97706"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01z"/></svg>';
  const svgBug = '<svg viewBox="0 0 24 24" fill="#e53935"><circle cx="12" cy="12" r="10" fill="none" stroke="#e53935" stroke-width="2"/><line x1="12" y1="8" x2="12" y2="12" stroke="#e53935" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="16" r="1" fill="#e53935"/></svg>';
  const svgFeedback = '<svg viewBox="0 0 24 24" fill="none" stroke="#1a73e8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  const svgExit = '<svg viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>';

  const cards = [
    { icon: svgStar, cls: "fb-star", title: "Request a Feature", sub: "Suggest an improvement or new idea", link: FORM_LINK },
    { icon: svgBug, cls: "fb-bug", title: "Report a Bug", sub: "Something isn't working correctly", link: FORM_LINK },
    { icon: svgFeedback, cls: "fb-feedback", title: "Give Feedback", sub: "Share your thoughts with us", link: FORM_LINK },
    { icon: svgExit, cls: "fb-uninstall", title: "Uninstall Feedback", sub: "Tell us why you're leaving", link: UNINSTALL_LINK },
  ];

  function init() {
    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    var root = document.createElement("div");
    root.className = "fb-widget";

    var popup = document.createElement("div");
    popup.className = "fb-widget-popup";
    popup.innerHTML =
      '<h3>How can we help?</h3><p class="fb-subtitle">Choose an option below to share your feedback.</p>' +
      cards
        .map(
          function (c) {
            return (
              '<a class="fb-widget-card" href="' + c.link + '" target="_blank" rel="noopener">' +
              '<div class="fb-widget-icon ' + c.cls + '">' + c.icon + "</div>" +
              '<div class="fb-widget-card-text"><span>' + c.title + "</span><small>" + c.sub + "</small></div>" +
              "</a>"
            );
          }
        )
        .join("");

    var fab = document.createElement("button");
    fab.className = "fb-widget-fab";
    fab.setAttribute("aria-label", "Feedback");
    fab.innerHTML = svgChat;

    var isOpen = false;
    fab.addEventListener("click", function (e) {
      e.stopPropagation();
      isOpen = !isOpen;
      popup.classList.toggle("fb-visible", isOpen);
      fab.classList.toggle("fb-open", isOpen);
      fab.innerHTML = isOpen ? svgClose : svgChat;
    });

    document.addEventListener("click", function (e) {
      if (isOpen && !root.contains(e.target)) {
        isOpen = false;
        popup.classList.remove("fb-visible");
        fab.classList.remove("fb-open");
        fab.innerHTML = svgChat;
      }
    });

    root.appendChild(popup);
    root.appendChild(fab);
    document.body.appendChild(root);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
