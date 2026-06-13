/**
 * mermaid-zoom.js
 *
 * Click-to-expand for Mermaid diagrams rendered by Material for MkDocs.
 * Opens a full-screen modal with pan & zoom via the browser's built-in
 * SVG viewport — no external dependencies.
 *
 * Usage: add to extra_javascript in mkdocs.yml.
 */
(function () {
  "use strict";

  /* ── helpers ──────────────────────────────────────────────────── */

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

    /* close on backdrop click */
    modal.querySelector(".mm-backdrop").addEventListener("click", closeModal);
    /* close on × button */
    modal.querySelector(".mm-close").addEventListener("click", closeModal);
    /* close on Escape */
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeModal();
    });

    return modal;
  }

  function openModal(svgEl) {
    var modal = getModal();
    var body = modal.querySelector(".mm-body");

    /* clone SVG so we don't disturb the inline one */
    var clone = svgEl.cloneNode(true);

    /* make SVG fill the modal frame while respecting aspect ratio */
    clone.removeAttribute("width");
    clone.removeAttribute("height");
    clone.style.width = "100%";
    clone.style.height = "100%";
    clone.style.display = "block";

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

  /* ── wire up click handlers ────────────────────────────────────── */

  function attachZoom(wrapper) {
    if (wrapper.dataset.mmInit) return;
    wrapper.dataset.mmInit = "1";

    var svgEl = wrapper.querySelector("svg");
    if (!svgEl) return;

    wrapper.setAttribute("title", "Click to expand");
    wrapper.style.cursor = "zoom-in";

    /* zoom-in hint badge */
    var badge = document.createElement("span");
    badge.className = "mm-hint";
    badge.textContent = "click to expand";
    wrapper.style.position = "relative";
    wrapper.appendChild(badge);

    wrapper.addEventListener("click", function () {
      openModal(wrapper.querySelector("svg"));
    });
  }

  function initAll() {
    /* Material renders mermaid inside .mermaid divs after JS runs */
    document.querySelectorAll(".mermaid").forEach(attachZoom);
  }

  /* ── observe late-rendered diagrams (SPA navigation) ──────────── */

  function observe() {
    var mo = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          if (node.classList && node.classList.contains("mermaid")) {
            attachZoom(node);
          }
          node.querySelectorAll && node.querySelectorAll(".mermaid").forEach(attachZoom);
        });
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  /* ── boot ──────────────────────────────────────────────────────── */

  /* Material for MkDocs exposes document$ (RxJS observable).
     We hook into it so the handler re-runs on every page navigation. */
  if (typeof document$ !== "undefined") {
    document$.subscribe(function () {
      /* small delay to let mermaid finish rendering */
      setTimeout(initAll, 200);
    });
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(initAll, 200);
    });
  }

  observe();
})();

// Make the site title text in the header navigate to home (Material only wraps the logo icon, not the text)
(function () {
  function attachTitleLink() {
    var title = document.querySelector('.md-header__title');
    if (!title || title.dataset.homeLinked) return;
    title.dataset.homeLinked = '1';
    title.style.cursor = 'pointer';
    title.addEventListener('click', function () {
      var base = document.querySelector('base')?.href || '/';
      window.location.href = base;
    });
  }
  document.addEventListener('DOMContentLoaded', attachTitleLink);
  // Re-attach after MkDocs instant navigation swaps the DOM
  document.addEventListener('DOMContentSwitch', attachTitleLink);
})();
