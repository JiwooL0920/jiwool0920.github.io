/**
 * mermaid-zoom.js
 *
 * Click-to-expand for Mermaid diagrams rendered by Material for MkDocs.
 * Opens a full-screen modal — no external dependencies.
 */
(function () {
  "use strict";

  /* ── modal helpers ─────────────────────────────────────────────── */

  function getModal() {
    var existing = document.getElementById("mermaid-modal");
    if (existing) return existing;

    var modal = document.createElement("div");
    modal.id = "mermaid-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "Diagram expanded view");
    modal.innerHTML =
      '<div class="mm-backdrop"></div>' +
      '<div class="mm-frame">' +
      '  <button class="mm-close" aria-label="Close">' +
      '    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">' +
      '      <path d="M18 6L6 18M6 6l12 12"/>' +
      "    </svg>" +
      "  </button>" +
      '  <div class="mm-body"></div>' +
      "</div>";

    document.body.appendChild(modal);
    modal.querySelector(".mm-backdrop").addEventListener("click", closeModal);
    modal.querySelector(".mm-close").addEventListener("click", closeModal);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeModal();
    });
    return modal;
  }

  function openModal(svgEl) {
    var modal = getModal();
    var body = modal.querySelector(".mm-body");
    var clone = svgEl.cloneNode(true);
    clone.removeAttribute("width");
    clone.removeAttribute("height");
    clone.style.cssText = "width:100%;height:100%;display:block;";
    body.innerHTML = "";
    body.appendChild(clone);
    modal.classList.add("mm-open");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    var modal = document.getElementById("mermaid-modal");
    if (modal) {
      modal.classList.remove("mm-open");
      document.body.style.overflow = "";
    }
  }

  /* ── attach zoom to a single wrapper ───────────────────────────── */

  function attachZoom(wrapper) {
    /* Don't re-init already wired wrappers */
    if (wrapper.dataset.mmInit) return;

    /* SVG may not be rendered yet — don't mark as init until we find it */
    var svgEl = wrapper.querySelector("svg");
    if (!svgEl) return;

    /* Mark AFTER successful find */
    wrapper.dataset.mmInit = "1";

    wrapper.setAttribute("title", "Click to expand");
    wrapper.style.cursor = "zoom-in";
    wrapper.style.position = "relative";

    var badge = document.createElement("span");
    badge.className = "mm-hint";
    badge.textContent = "click to expand";
    wrapper.appendChild(badge);

    wrapper.addEventListener("click", function () {
      openModal(wrapper.querySelector("svg"));
    });
  }

  /* ── scan all .mermaid wrappers on the current page ────────────── */

  function scanAll() {
    document.querySelectorAll(".mermaid").forEach(attachZoom);
  }

  /* ── observe DOM mutations ─────────────────────────────────────── */
  /*
   * Mermaid renders by INSERTING an <svg> inside an already-present
   * .mermaid div, not by adding a new .mermaid div.  We therefore
   * also catch SVG nodes whose closest ancestor is .mermaid.
   */
  function observe() {
    var mo = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;

          /* Case 1: a new .mermaid container was added */
          if (node.classList && node.classList.contains("mermaid")) {
            attachZoom(node);
          }

          /* Case 2: an <svg> was injected inside a .mermaid parent */
          if (node.nodeName.toLowerCase() === "svg") {
            var parent = node.closest ? node.closest(".mermaid") : null;
            if (!parent && node.parentElement &&
                node.parentElement.classList &&
                node.parentElement.classList.contains("mermaid")) {
              parent = node.parentElement;
            }
            if (parent) attachZoom(parent);
          }

          /* Case 3: subtree scan (covers nested structures) */
          if (node.querySelectorAll) {
            node.querySelectorAll(".mermaid").forEach(attachZoom);
          }
        });
      });
    });

    mo.observe(document.body, { childList: true, subtree: true });
  }

  /* ── boot ──────────────────────────────────────────────────────── */

  function boot() {
    /* Scan immediately, then retry progressively to catch slow renders */
    scanAll();
    setTimeout(scanAll, 300);
    setTimeout(scanAll, 800);
    setTimeout(scanAll, 2000);
    setTimeout(scanAll, 4000);
  }

  /* Material exposes document$ (RxJS); hook into it for SPA navigation */
  if (typeof document$ !== "undefined") {
    document$.subscribe(boot);
  } else {
    document.addEventListener("DOMContentLoaded", boot);
  }

  observe();
})();

/* ── Make site title text clickable (Material only wraps the logo icon) ── */
(function () {
  function attachTitleLink() {
    var title = document.querySelector(".md-header__title");
    if (!title || title.dataset.homeLinked) return;
    title.dataset.homeLinked = "1";
    title.style.cursor = "pointer";
    title.addEventListener("click", function () {
      var base = document.querySelector("base") ? document.querySelector("base").href : "/";
      window.location.href = base;
    });
  }
  document.addEventListener("DOMContentLoaded", attachTitleLink);
  document.addEventListener("DOMContentSwitch", attachTitleLink);
})();
