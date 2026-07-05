(function () {
  const EXTENSION_ID = "ebpikpmmnpjmlcpanakfcgchkdjaanmm";
  const SHIELDS_BASE = `https://img.shields.io/chrome-web-store`;

  async function fetchShieldValue(metric) {
    const response = await fetch(
      `${SHIELDS_BASE}/${metric}/${EXTENSION_ID}.json`
    );
    if (!response.ok) {
      throw new Error(`shields.io request failed for ${metric}`);
    }
    const data = await response.json();
    return data.value;
  }

  async function updateUsers() {
    const el = document.getElementById("stat-users");
    if (!el) return;
    const value = await fetchShieldValue("users");
    el.textContent = `${value.toUpperCase()}+`;
  }

  async function updateRating() {
    const el = document.getElementById("stat-rating");
    if (!el) return;
    const value = await fetchShieldValue("rating");
    const score = value.split("/")[0];
    el.textContent = `${score}★`;
  }

  updateUsers().catch(error =>
    console.error("YouTube Hider: failed to load Chrome Web Store users", error)
  );
  updateRating().catch(error =>
    console.error("YouTube Hider: failed to load Chrome Web Store rating", error)
  );
})();
