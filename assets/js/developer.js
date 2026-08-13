// developer.js — renders a single developer/agency profile page from ?id= query param

(function () {
  var WORKER_BASE_URL = "https://cea-listing-worker.ceafricaorg.workers.dev";
  var PAGE_SIZE = 9;

  var allListings = [];
  var currentPage = 1;

  function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function fmtPrice(price) {
    return price
      ? "&#8358;" + Number(price).toLocaleString("en-NG")
      : "Price on request";
  }

  function showError(msg) {
    var el = document.getElementById("devContent");
    if (el) {
      el.innerHTML =
        '<div class="no-results" style="padding:80px 20px;">' +
          '<div class="no-results-icon">&#128683;</div>' +
          '<h3>' + msg + '</h3>' +
          '<p><a href="developers.html" class="btn-submit" style="display:inline-block;width:auto;padding:12px 24px;text-decoration:none;">Browse all partners</a></p>' +
        "</div>";
    }
  }

  // ── Fetch developer profile ──────────────────────────────────────────────
  function fetchDeveloper(id) {
    return fetch(WORKER_BASE_URL + "/developers/" + encodeURIComponent(id))
      .then(function (res) {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      });
  }

  // ── Fetch listings filtered by developerId ───────────────────────────────
  // Tries dedicated endpoint first; falls back to filtering /listings client-side
  function fetchDeveloperListings(id) {
    return fetch(WORKER_BASE_URL + "/listings?developerId=" + encodeURIComponent(id))
      .then(function (res) {
        if (!res.ok) throw new Error("fallback");
        return res.json();
      })
      .then(function (data) {
        return Array.isArray(data) ? data : (data.listings || []);
      })
      .catch(function () {
        // fallback: load all listings and filter client-side
        return fetch(WORKER_BASE_URL + "/listings")
          .then(function (res) { return res.json(); })
          .then(function (data) {
            var all = Array.isArray(data) ? data : (data.listings || []);
            return all.filter(function (l) { return l.developerId === id; });
          });
      });
  }

  // ── Render developer hero / profile header ───────────────────────────────
  function renderHero(dev) {
    var heroEl = document.getElementById("devHero");
    if (!heroEl) return;

    var coverStyle = dev.coverPhoto
      ? 'background-image:url("' + escHtml(dev.coverPhoto) + '");background-size:cover;background-position:center;'
      : 'background:linear-gradient(135deg,#11214f,#0a1733);';

    var logoHtml = dev.logo
      ? '<img src="' + escHtml(dev.logo) + '" alt="' + escHtml(dev.name) + ' logo" class="dev-logo-img" />'
      : '<div class="dev-logo-placeholder">' + escHtml((dev.name || "?")[0].toUpperCase()) + '</div>';

    var socialHtml = "";
    if (dev.socialLinks) {
      var s = dev.socialLinks;
      if (s.website) socialHtml += '<a href="' + escHtml(s.website) + '" target="_blank" rel="noopener" class="dev-social-link" title="Website">&#127760;</a>';
      if (s.linkedin) socialHtml += '<a href="' + escHtml(s.linkedin) + '" target="_blank" rel="noopener" class="dev-social-link" title="LinkedIn"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg></a>';
      if (s.instagram) socialHtml += '<a href="' + escHtml(s.instagram) + '" target="_blank" rel="noopener" class="dev-social-link" title="Instagram"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg></a>';
      if (s.facebook) socialHtml += '<a href="' + escHtml(s.facebook) + '" target="_blank" rel="noopener" class="dev-social-link" title="Facebook"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></a>';
      if (s.twitter) socialHtml += '<a href="' + escHtml(s.twitter) + '" target="_blank" rel="noopener" class="dev-social-link" title="X / Twitter"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>';
    }

    var statsHtml =
      '<div class="dev-stat"><span class="dev-stat-val">' + (dev.totalListings || 0) + '</span><span class="dev-stat-label">Listings</span></div>' +
      (dev.established ? '<div class="dev-stat"><span class="dev-stat-val">' + escHtml(dev.established) + '</span><span class="dev-stat-label">Est.</span></div>' : '') +
      (dev.location ? '<div class="dev-stat"><span class="dev-stat-val">' + escHtml(dev.location) + '</span><span class="dev-stat-label">Location</span></div>' : '');

    heroEl.innerHTML =
      '<div class="dev-cover" style="' + coverStyle + '">' +
        '<div class="dev-cover-overlay"></div>' +
      '</div>' +
      '<div class="container">' +
        '<div class="dev-profile-row">' +
          '<div class="dev-logo-wrap">' + logoHtml + '</div>' +
          '<div class="dev-profile-info">' +
            '<div class="dev-name-row">' +
              '<h1 class="dev-name">' + escHtml(dev.name || "") + '</h1>' +
              (dev.verified ? '<span class="dev-verified-badge">&#10003; CEA Partner</span>' : '') +
            '</div>' +
            (dev.tagline ? '<p class="dev-tagline">' + escHtml(dev.tagline) + '</p>' : '') +
            '<div class="dev-stats-row">' + statsHtml + '</div>' +
            (socialHtml ? '<div class="dev-social-row">' + socialHtml + '</div>' : '') +
          '</div>' +
          (dev.phone || dev.email
            ? '<div class="dev-contact-card">' +
                '<div class="dev-contact-title">Contact</div>' +
                (dev.phone ? '<a href="tel:' + escHtml(dev.phone) + '" class="dev-contact-link">&#128222; ' + escHtml(dev.phone) + '</a>' : '') +
                (dev.email ? '<a href="mailto:' + escHtml(dev.email) + '" class="dev-contact-link">&#9993; ' + escHtml(dev.email) + '</a>' : '') +
                (dev.socialLinks && dev.socialLinks.website ? '<a href="' + escHtml(dev.socialLinks.website) + '" target="_blank" rel="noopener" class="dev-contact-link">&#127760; Website</a>' : '') +
              '</div>'
            : '') +
        '</div>' +
        (dev.description
          ? '<div class="dev-description"><p>' + escHtml(dev.description) + '</p></div>'
          : '') +
      '</div>';
  }

  // ── Render listing card (mirrors properties.js renderCard) ───────────────
  function renderCard(listing) {
    var detailUrl = "property.html?id=" + encodeURIComponent(listing.id || "");
    var photoSrc = (listing.photos && listing.photos.length > 0) ? listing.photos[0] : "";
    var photoHtml = photoSrc
      ? '<img src="' + escHtml(photoSrc) + '" alt="' + escHtml(listing.address) + '" loading="lazy" onerror="this.onerror=null;this.parentElement.classList.add(\'no-photo\');this.remove();" />'
      : "";
    var wrapClass = "property-photo-wrap" + (photoSrc ? "" : " no-photo");
    var titleBadge = listing.titleType
      ? '<span class="title-badge">Title: ' + escHtml(listing.titleType) + "</span>"
      : "";
    var descSnippet = (listing.description || "").substring(0, 140);
    if ((listing.description || "").length > 140) descSnippet += "…";

    return (
      '<div class="property-card">' +
        '<a href="' + detailUrl + '" class="property-card-link" aria-label="View details for ' + escHtml(listing.address || "this property") + '">' +
          '<div class="' + wrapClass + '">' +
            photoHtml +
            (typeof CEA_BADGES !== "undefined"
              ? '<span style="position:absolute;top:10px;left:10px;">' + CEA_BADGES.verified("sm") + "</span>"
              : '<span class="cea-verified-badge">&#10003; CEA Verified</span>') +
            titleBadge +
          "</div>" +
          '<div class="property-card-body">' +
            '<span class="prop-type-chip">' + escHtml(listing.propertyType || "Property") + "</span>" +
            '<h3 class="prop-address">' + escHtml(listing.address || "") + "</h3>" +
            '<div class="prop-meta">' +
              '<span>' + escHtml(listing.location || "") + "</span>" +
              '<span class="prop-price">' + fmtPrice(listing.price) + "</span>" +
            "</div>" +
            (descSnippet ? '<p class="prop-desc">' + escHtml(descSnippet) + "</p>" : "") +
            (typeof CEA_BADGES !== "undefined" ? CEA_BADGES.badgeRow() : "") +
          "</div>" +
        "</a>" +
        '<div class="property-card-footer">' +
          '<button class="book-tour-btn" data-listing-id="' + escHtml(listing.id || "") + '" data-address="' + escHtml(listing.address || "") + '">Book a Tour</button>' +
          '<a href="' + detailUrl + '" class="view-details-link">View Details &#8594;</a>' +
        "</div>" +
      "</div>"
    );
  }

  // ── Render listings grid with pagination ─────────────────────────────────
  function renderGrid() {
    var gridEl = document.getElementById("devGrid");
    var paginEl = document.getElementById("devPagination");
    if (!gridEl) return;

    if (!allListings.length) {
      gridEl.innerHTML =
        '<div class="no-results">' +
          '<div class="no-results-icon">&#128269;</div>' +
          '<h3>No listings yet</h3>' +
          '<p>This developer\'s properties will appear here once they\'re published.</p>' +
        "</div>";
      if (paginEl) paginEl.innerHTML = "";
      return;
    }

    var start = (currentPage - 1) * PAGE_SIZE;
    var pageItems = allListings.slice(start, start + PAGE_SIZE);
    gridEl.innerHTML = pageItems.map(renderCard).join("");
    renderPagination(paginEl);
  }

  function renderPagination(paginEl) {
    if (!paginEl) return;
    var totalPages = Math.ceil(allListings.length / PAGE_SIZE);
    if (totalPages <= 1) { paginEl.innerHTML = ""; return; }

    var html = '<button class="page-btn" id="devPrev"' + (currentPage === 1 ? " disabled" : "") + '>&laquo; Prev</button>';
    for (var p = 1; p <= totalPages; p++) {
      html += '<button class="page-btn' + (p === currentPage ? " active" : "") + '" data-page="' + p + '">' + p + "</button>";
    }
    html += '<button class="page-btn" id="devNext"' + (currentPage === totalPages ? " disabled" : "") + '>Next &raquo;</button>';
    paginEl.innerHTML = html;

    var prev = document.getElementById("devPrev");
    var next = document.getElementById("devNext");
    if (prev) prev.addEventListener("click", function () { if (currentPage > 1) { currentPage--; renderGrid(); scrollToGrid(); } });
    if (next) next.addEventListener("click", function () { if (currentPage < totalPages) { currentPage++; renderGrid(); scrollToGrid(); } });
    paginEl.querySelectorAll(".page-btn[data-page]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        currentPage = parseInt(this.getAttribute("data-page"), 10);
        renderGrid();
        scrollToGrid();
      });
    });
  }

  function scrollToGrid() {
    var g = document.getElementById("devGrid");
    if (g) g.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ── Init ─────────────────────────────────────────────────────────────────
  function init() {
    var id = getQueryParam("id");
    if (!id) { showError("No developer specified"); return; }

    var loadTimeout = setTimeout(function () { showError("This page is taking too long to load"); }, 15000);

    Promise.all([fetchDeveloper(id), fetchDeveloperListings(id)])
      .then(function (results) {
        clearTimeout(loadTimeout);
        var dev = results[0];
        var listings = results[1];

        // Update page title & meta
        document.title = (dev.name || "Developer") + " Properties | CEA Verified | Castlerock Econetwork Africa";

        // Render hero
        renderHero(dev);

        // Update listing count badge
        var countEl = document.getElementById("devListingCount");
        if (countEl) countEl.textContent = listings.length + " Propert" + (listings.length === 1 ? "y" : "ies");

        // Hide skeleton, show content
        var skeletonEl = document.getElementById("devSkeleton");
        if (skeletonEl) skeletonEl.style.display = "none";
        var contentEl = document.getElementById("devContent");
        if (contentEl) contentEl.style.display = "";

        allListings = listings;
        currentPage = 1;
        renderGrid();
      })
      .catch(function () {
        clearTimeout(loadTimeout);
        showError("Developer not found");
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
