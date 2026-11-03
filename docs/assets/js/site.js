(function () {
  const root = document.documentElement;
  root.classList.add("js");

  const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const fineMq = window.matchMedia("(hover: hover) and (pointer: fine)");
  const pinnedMq = window.matchMedia("(min-width: 1024px) and (min-height: 640px)");
  const wideMq = window.matchMedia("(min-width: 1024px)");
  const hasIO = "IntersectionObserver" in window;
  const motion = !reduceMq.matches && hasIO;
  if (motion) root.classList.add("has-motion");

  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const round = v => Math.round(v * 100) / 100;

  const atmosphere = document.createElement("div");
  atmosphere.className = "atmosphere";
  atmosphere.setAttribute("aria-hidden", "true");
  atmosphere.append(document.createElement("div"), document.createElement("div"), document.createElement("div"));
  document.body.prepend(atmosphere);

  const updaters = new Map();
  const active = new Set();
  const toneSections = [...document.querySelectorAll("[data-tone]")];
  let ticking = 0;

  const sectionObserver = hasIO
    ? new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) active.add(entry.target);
            else active.delete(entry.target);
          });
          schedule();
        },
        { rootMargin: "25% 0px 25% 0px" }
      )
    : null;

  function register(el, fn) {
    updaters.set(el, fn);
    if (sectionObserver) sectionObserver.observe(el);
    else active.add(el);
    fn(window.innerHeight);
  }

  function updateTone(vh) {
    if (!toneSections.length) return;
    let tone = toneSections[0].dataset.tone;
    for (const section of toneSections) {
      if (section.getBoundingClientRect().top <= vh * 0.55) tone = section.dataset.tone;
    }
    if (root.dataset.tone !== tone) root.dataset.tone = tone;
  }

  function frame() {
    ticking = 0;
    const vh = window.innerHeight;
    active.forEach(el => updaters.get(el)(vh));
    updateTone(vh);
  }

  function schedule() {
    if (!ticking) ticking = window.requestAnimationFrame(frame);
  }

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });

  function onceVisible(el, threshold, fn) {
    if (!hasIO) return fn();
    const observer = new IntersectionObserver(
      entries => {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();
        fn();
      },
      { threshold }
    );
    observer.observe(el);
  }

  function pauseOffscreen(el) {
    if (!hasIO) return;
    new IntersectionObserver(entries => {
      el.classList.toggle("is-offscreen", !entries[0].isIntersecting);
    }).observe(el);
  }

  function initNav() {
    const header = document.querySelector("[data-nav]");
    if (!header) return;
    const toggle = header.querySelector(".nav-toggle");

    const setOpen = open => {
      header.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };

    if (toggle) {
      toggle.addEventListener("click", () => setOpen(!header.classList.contains("is-open")));
      header.querySelectorAll(".nav-links a").forEach(a => a.addEventListener("click", () => setOpen(false)));
      document.addEventListener("keydown", e => {
        if (e.key === "Escape" && header.classList.contains("is-open")) {
          setOpen(false);
          toggle.focus();
        }
      });
      document.addEventListener("pointerdown", e => {
        if (header.classList.contains("is-open") && !header.contains(e.target)) setOpen(false);
      });
    }

    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 24);
    window.requestAnimationFrame(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function initReveal() {
    const items = [...document.querySelectorAll("[data-reveal]")];
    document.querySelectorAll("[data-reveal-group]").forEach(group => {
      [...group.children].forEach((child, i) => {
        child.style.setProperty("--d", i % 4);
        items.push(child);
      });
    });
    if (!motion || !items.length) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );

    const vh = window.innerHeight;
    items.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < vh * 0.92 && rect.bottom > 0) return;
      el.classList.add("reveal");
      observer.observe(el);
    });

    document.addEventListener("focusin", e => {
      const el = e.target.closest(".reveal:not(.is-visible)");
      if (el) el.classList.add("is-visible");
    });
  }

  function initSpotlight() {
    if (!fineMq.matches) return;
    document.querySelectorAll(".spotlight").forEach(el => {
      let raf = 0;
      let x = 0;
      let y = 0;
      el.addEventListener("pointermove", e => {
        const rect = el.getBoundingClientRect();
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
        if (raf) return;
        raf = window.requestAnimationFrame(() => {
          raf = 0;
          el.style.setProperty("--mx", `${x.toFixed(1)}px`);
          el.style.setProperty("--my", `${y.toFixed(1)}px`);
        });
      });
    });
  }

  function initMagnetic() {
    if (!motion || !fineMq.matches) return;
    document.querySelectorAll("[data-magnetic]").forEach(el => {
      el.addEventListener("pointermove", e => {
        const rect = el.getBoundingClientRect();
        const dx = (e.clientX - (rect.left + rect.width / 2)) / rect.width;
        const dy = (e.clientY - (rect.top + rect.height / 2)) / rect.height;
        el.style.setProperty("--mag-x", `${(dx * 12).toFixed(2)}px`);
        el.style.setProperty("--mag-y", `${(dy * 10).toFixed(2)}px`);
      });
      el.addEventListener("pointerleave", () => {
        el.style.removeProperty("--mag-x");
        el.style.removeProperty("--mag-y");
      });
    });
  }

  function initMascots() {
    const mascots = [...document.querySelectorAll("[data-mascot]")];
    if (!mascots.length) return;
    mascots.forEach(pauseOffscreen);
    if (!fineMq.matches) {
      mascots.forEach(m => m.classList.add("no-pointer"));
      return;
    }
    let raf = 0;
    let px = 0;
    let py = 0;
    window.addEventListener(
      "pointermove",
      e => {
        px = e.clientX;
        py = e.clientY;
        if (raf) return;
        raf = window.requestAnimationFrame(() => {
          raf = 0;
          mascots.forEach(m => {
            if (m.classList.contains("is-offscreen")) return;
            const rect = m.getBoundingClientRect();
            const dx = px - (rect.left + rect.width / 2);
            const dy = py - (rect.top + rect.height * 0.56);
            const dist = Math.hypot(dx, dy) || 1;
            const reach = dist / (dist + 140);
            m.style.setProperty("--px", round((dx / dist) * reach));
            m.style.setProperty("--py", round((dy / dist) * reach));
            if (motion) {
              m.style.setProperty("--tilt-y", `${round(clamp(dx / 600, -1, 1) * 12)}deg`);
              m.style.setProperty("--tilt-x", `${round(clamp(-dy / 600, -1, 1) * 10)}deg`);
            }
          });
        });
      },
      { passive: true }
    );
  }

  function initDeclutter() {
    const hero = document.querySelector("[data-declutter]");
    if (!hero) return;
    const grid = hero.querySelector(".feed-grid");
    const slots = [...hero.querySelectorAll(".slot[data-cat]")];
    const rows = [...hero.querySelectorAll(".pm-row[data-cat]")];
    const counter = hero.querySelector("[data-hidden-count]");
    const order = ["watched", "shorts", "mix", "live", "views"];
    const seen = {};
    const plan = slots.map(slot => {
      const cat = slot.dataset.cat;
      seen[cat] = (seen[cat] || 0) + 1;
      return { slot, k: order.indexOf(cat), j: seen[cat] - 1, d: -1, c: -1 };
    });
    pauseOffscreen(hero);
    if (!motion) return;

    let lastCount = -1;
    register(hero, vh => {
      let p;
      if (pinnedMq.matches) {
        const rect = hero.getBoundingClientRect();
        p = clamp(-rect.top / Math.max(1, rect.height - vh));
      } else {
        const rect = grid.getBoundingClientRect();
        p = clamp((vh * 0.85 - rect.top) / (vh * 0.75));
      }
      const seg = clamp((p - 0.06) / 0.84) * order.length;
      rows.forEach(row => row.classList.toggle("is-on", seg - order.indexOf(row.dataset.cat) > 0.02));
      let hidden = 0;
      plan.forEach(item => {
        const local = seg - item.k - item.j * 0.15;
        const d = round(clamp(local / 0.35));
        const c = round(clamp((local - 0.45) / 0.5));
        if (d !== item.d) {
          item.d = d;
          item.slot.style.setProperty("--d", d);
        }
        if (c !== item.c) {
          item.c = c;
          item.slot.style.setProperty("--c", c);
        }
        if (c >= 0.5 && item.slot.offsetParent !== null) hidden++;
      });
      if (counter && hidden !== lastCount) {
        lastCount = hidden;
        counter.textContent = String(hidden);
      }
    });
  }

  function initOdometers() {
    const els = [...document.querySelectorAll("[data-odometer]")];
    if (!motion || !els.length) return;

    els.forEach(el => {
      let started = false;
      let writing = false;

      const build = (text, roll) => {
        writing = true;
        el.setAttribute("aria-label", text);
        const wrap = document.createElement("span");
        wrap.className = "odo";
        wrap.setAttribute("aria-hidden", "true");
        const strips = [];
        [...text].forEach((ch, i) => {
          if (/\d/.test(ch)) {
            const digit = document.createElement("span");
            digit.className = "odo-digit";
            const strip = document.createElement("span");
            strip.className = "odo-strip";
            strip.style.setProperty("--i", i);
            for (let n = 0; n <= 9; n++) {
              const s = document.createElement("span");
              s.textContent = String(n);
              strip.append(s);
            }
            digit.append(strip);
            wrap.append(digit);
            strips.push([strip, Number(ch)]);
          } else {
            const s = document.createElement("span");
            s.className = "odo-char";
            s.textContent = ch;
            wrap.append(s);
          }
        });
        el.textContent = "";
        el.append(wrap);
        const settle = () => strips.forEach(([strip, n]) => strip.style.setProperty("--n", n));
        if (roll) window.requestAnimationFrame(() => window.requestAnimationFrame(settle));
        else settle();
        observer.takeRecords();
        writing = false;
      };

      const observer = new MutationObserver(() => {
        if (writing) return;
        const text = el.textContent.trim();
        if (started) build(text, true);
      });
      observer.observe(el, { childList: true, characterData: true, subtree: true });

      onceVisible(el, 0.4, () => {
        started = true;
        build(el.getAttribute("aria-label") || el.textContent.trim(), true);
      });
    });
  }

  function initVideo() {
    document.querySelectorAll("[data-video]").forEach(button => {
      button.addEventListener("click", () => {
        const iframe = document.createElement("iframe");
        iframe.src = `https://www.youtube.com/embed/${button.dataset.video}?rel=0&modestbranding=1&autoplay=1`;
        iframe.title = "YouTube Hider Extension Demo";
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        iframe.allowFullscreen = true;
        button.replaceWith(iframe);
        iframe.focus();
      });
    });
  }

  function initFeatures() {
    const layout = document.querySelector("[data-features]");
    if (!layout || !motion) return;
    const frameEl = layout.querySelector(".popup-frame");
    const sticky = layout.querySelector(".modes-sticky");
    if (!frameEl || !sticky) return;
    let last = -1;
    register(layout, vh => {
      let p;
      if (wideMq.matches) {
        const rect = layout.getBoundingClientRect();
        const travel = Math.max(1, rect.height - sticky.offsetHeight);
        p = clamp((sticky.getBoundingClientRect().top - rect.top) / travel);
      } else {
        const rect = frameEl.getBoundingClientRect();
        p = clamp((vh * 0.9 - rect.top) / (vh * 0.9 + rect.height * 0.2));
      }
      p = round(p);
      if (p === last) return;
      last = p;
      frameEl.style.setProperty("--shot-p", p);
    });
  }

  function initWatched() {
    const layout = document.querySelector("[data-watched]");
    if (!layout) return;
    const steps = [...layout.querySelectorAll("[data-watched-step]")];
    const wipe = layout.querySelector("[data-wipe]");
    if (wipe && motion) {
      wipe.classList.add("wipe");
      onceVisible(wipe.parentElement, 0.2, () => wipe.classList.add("is-visible"));
    }
    if (!steps.length || !hasIO) return;
    let current = -1;
    register(layout, vh => {
      const focus = vh * 0.5;
      let best = 0;
      let bestDistance = Infinity;
      steps.forEach((step, i) => {
        const rect = step.getBoundingClientRect();
        const distance = Math.abs(rect.top + rect.height / 2 - focus);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = i;
        }
      });
      if (best === current) return;
      current = best;
      steps.forEach((step, i) => step.classList.toggle("is-active", i === best));
    });
  }

  function initRedact() {
    document.querySelectorAll("[data-redact]").forEach(el => {
      const words = el.textContent.trim().split(/\s+/);
      el.textContent = "";
      const spans = words.map((word, i) => {
        if (i) el.append(" ");
        const span = document.createElement("span");
        span.className = "w";
        span.textContent = word;
        el.append(span);
        return span;
      });
      if (!motion) return;
      const values = spans.map(() => -1);
      register(el, vh => {
        const rect = el.getBoundingClientRect();
        const p = clamp((vh * 0.85 - rect.top) / (vh * 0.45));
        spans.forEach((span, i) => {
          const v = round(clamp(p * spans.length - i));
          if (v === values[i]) return;
          values[i] = v;
          span.style.setProperty("--r", v);
        });
      });
    });
  }

  function initBlinds() {
    if (!motion) return;
    document.querySelectorAll("[data-blinds]").forEach(el => {
      el.classList.add("is-armed");
      const blinds = el.querySelectorAll(".blinds i");
      const lastBlind = blinds[0];
      onceVisible(el, 0.35, () => el.classList.add("is-playing"));
      if (lastBlind) lastBlind.addEventListener("animationend", () => el.classList.add("is-open"), { once: true });
      el.addEventListener("focusin", () => el.classList.add("is-playing", "is-open"));
    });
  }

  function initFabZones() {
    const zones = [...document.querySelectorAll(".hero, .cta-panel, .site-footer, .not-found")];
    if (!zones.length || !hasIO) return;
    const visible = new Set();
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) visible.add(entry.target);
          else visible.delete(entry.target);
        });
        root.classList.toggle("fab-hidden", visible.size > 0);
      },
      { rootMargin: "-20% 0px -25% 0px" }
    );
    zones.forEach(zone => observer.observe(zone));
  }

  initNav();
  initReveal();
  initSpotlight();
  initMagnetic();
  initMascots();
  initDeclutter();
  initOdometers();
  initVideo();
  initFeatures();
  initWatched();
  initRedact();
  initBlinds();
  initFabZones();
  document.querySelectorAll(".footer-marquee").forEach(pauseOffscreen);
  frame();
})();
