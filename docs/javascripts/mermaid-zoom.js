/**
 * mermaid-zoom.js
 *
 * Click-to-expand for Mermaid diagrams rendered by Material for MkDocs 9.x.
 *
 * Material for MkDocs renders mermaid diagrams into a CLOSED shadow DOM
 * on the .mermaid div, so querySelector("svg") always returns null.
 * Instead we fetch the raw page HTML to extract the source text, then
 * re-render it with mermaid.render() inside a full-screen modal.
 */
(function () {
  "use strict";

  /* ── source cache (keyed by page URL) ──────────────────────────── */
  var sourceCache = {};

  async function fetchSources(url) {
    if (sourceCache[url]) return sourceCache[url];
    try {
      var html = await fetch(url).then(function (r) { return r.text(); });
      var doc = new DOMParser().parseFromString(html, "text/html");
      var srcs = [];
      doc.querySelectorAll("pre.mermaid code, code.language-mermaid").forEach(function (el) {
        var s = el.textContent.trim();
        if (s) srcs.push(s);
      });
      sourceCache[url] = srcs;
      return srcs;
    } catch (e) {
      return [];
    }
  }

  /* ── modal ──────────────────────────────────────────────────────── */

  function closeModal() {
    var m = document.getElementById("mm-modal");
    if (m) {
      m.classList.remove("mm-open");
      document.body.style.overflow = "";
    }
  }

  async function openModal(source) {
    if (typeof mermaid === "undefined") return;

    var modal = document.getElementById("mm-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "mm-modal";
      modal.innerHTML =
        '<div class="mm-backdrop"></div>' +
        '<div class="mm-frame">' +
        '  <button class="mm-close" aria-label="Close">' +
        '    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">' +
        '      <path d="M18 6L6 18M6 6l12 12"/>' +
        "    </svg>" +
        "  </button>" +
        '  <div class="mm-body"><p class="mm-loading">Rendering\u2026</p></div>' +
        "</div>";
      document.body.appendChild(modal);
      modal.querySelector(".mm-backdrop").addEventListener("click", closeModal);
      modal.querySelector(".mm-close").addEventListener("click", closeModal);
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") closeModal();
      });
    }

    var body = modal.querySelector(".mm-body");
    body.innerHTML = '<p class="mm-loading">Rendering\u2026</p>';
    modal.classList.add("mm-open");
    document.body.style.overflow = "hidden";

    try {
      var id = "mmz-" + Date.now();
      var result = await mermaid.render(id, source);
      var svg = result.svg || result; /* mermaid 10: {svg}, older: string */
      body.innerHTML = svg;
      var svgEl = body.querySelector("svg");
      if (svgEl) {
        svgEl.removeAttribute("width");
        svgEl.removeAttribute("height");
        svgEl.style.cssText = "max-width:100%;height:auto;display:block;";
      }
    } catch (e) {
      body.innerHTML =
        '<pre class="mm-error">' + String(e.message || e) + "</pre>";
    }
  }

  /* ── attach zoom handler to a .mermaid div ──────────────────────── */

  function attachZoom(div, source) {
    if (div.dataset.mmz) return;
    div.dataset.mmz = "1";
    div.setAttribute("title", "Click to expand diagram");
    div.style.cursor = "zoom-in";
    div.addEventListener("click", function () { openModal(source); });
  }

  /* ── scan and attach all unhandled .mermaid divs ────────────────── */

  async function attachAll() {
    var divs = Array.from(document.querySelectorAll("div.mermaid:not([data-mmz])"));
    if (!divs.length) return;

    var srcs = await fetchSources(location.href);
    if (!srcs.length) return;

    divs.forEach(function (div, i) {
      if (srcs[i]) attachZoom(div, srcs[i]);
    });
  }

  /* ── observe DOM for new .mermaid divs (SPA navigation) ─────────── */

  var scanTimer = null;
  function scheduleScan() {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(attachAll, 150);
  }

  new MutationObserver(function (mutations) {
    var relevant = mutations.some(function (m) {
      return Array.from(m.addedNodes).some(function (n) {
        return (
          n.nodeType === 1 &&
          (
            (n.classList && n.classList.contains("mermaid")) ||
            (n.querySelector && n.querySelector(".mermaid"))
          )
        );
      });
    });
    if (relevant) scheduleScan();
  }).observe(document.body, { childList: true, subtree: true });

  /* ── boot ───────────────────────────────────────────────────────── */

  function boot() {
    /* Clear source cache on SPA navigation so fresh sources are fetched */
    delete sourceCache[location.href];
    /* Retry a few times to catch Material's async mermaid processing */
    [200, 600, 1500, 3000].forEach(function (t) {
      setTimeout(attachAll, t);
    });
  }

  if (typeof document$ !== "undefined") {
    /* Material SPA: fires on every page load / navigation */
    document$.subscribe(boot);
  } else {
    document.addEventListener("DOMContentLoaded", boot);
  }
})();

/* ── Make site title text clickable ──────────────────────────────────── */
(function () {
  function attachTitleLink() {
    var title = document.querySelector(".md-header__title");
    if (!title || title.dataset.homeLinked) return;
    title.dataset.homeLinked = "1";
    title.style.cursor = "pointer";
    title.addEventListener("click", function () {
      var base = document.querySelector("base")
        ? document.querySelector("base").href
        : "/";
      window.location.href = base;
    });
  }
  document.addEventListener("DOMContentLoaded", attachTitleLink);
  document.addEventListener("DOMContentSwitch", attachTitleLink);
})();
