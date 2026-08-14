(function () {
  var WORKER_BASE_URL = "https://cea-listing-worker.ceafricaorg.workers.dev";
  var MAPS_API_KEY = "AIzaSyDtn5xX5kV7iz35_4NqY19HmrIYEU4n_aM";

  var loadingState = document.getElementById("loadingState");
  var expiredState = document.getElementById("expiredState");
  var formSection = document.getElementById("listingFormSection");

  var params = new URLSearchParams(window.location.search);
  var token = params.get("token");

  function showExpired() {
    loadingState.style.display = "none";
    formSection.style.display = "none";
    expiredState.style.display = "flex";
  }

  function showForm() {
    loadingState.style.display = "none";
    expiredState.style.display = "none";
    formSection.style.display = "block";
  }

  if (!token) { showExpired(); return; }

  fetch(WORKER_BASE_URL + "/verify-token?token=" + encodeURIComponent(token))
    .then(function (r) { return r.json(); })
    .then(function (d) { if (d.valid) showForm(); else showExpired(); })
    .catch(showExpired);

  // ── Identity fields ──────────────────────────────────────────
  var fields = {
    email:     { el: document.getElementById("email"),     group: document.getElementById("group-email"),     ok: function(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); } },
    firstName: { el: document.getElementById("firstName"), group: document.getElementById("group-firstName"), ok: function(v){ return v.trim().length >= 2; } },
    lastName:  { el: document.getElementById("lastName"),  group: document.getElementById("group-lastName"),  ok: function(v){ return v.trim().length >= 2; } },
    dob:       { el: document.getElementById("dob"),       group: document.getElementById("group-dob"),       ok: function(v){ return v.trim().length > 0; } },
    vnin:      { el: document.getElementById("vnin"),      group: document.getElementById("group-vnin"),      ok: function(v){ return v.trim().length >= 10; } },
  };

  function setError(f, on) { f.group.classList.toggle("has-error", on); }

  Object.keys(fields).forEach(function(k) {
    var f = fields[k];
    f.el.addEventListener("input", function() {
      if (f.group.classList.contains("has-error") && f.ok(f.el.value)) setError(f, false);
    });
  });

  var verifyBtn    = document.getElementById("verifyIdentityBtn");
  var identityMsg  = document.getElementById("identityStatus");

  verifyBtn.addEventListener("click", function () {
    var valid = true;
    Object.keys(fields).forEach(function(k) {
      var ok = fields[k].ok(fields[k].el.value);
      setError(fields[k], !ok);
      if (!ok) valid = false;
    });
    if (!valid) {
      identityMsg.className = "form-status failure";
      identityMsg.textContent = "Please correct the highlighted fields above.";
      return;
    }

    verifyBtn.disabled = true;
    verifyBtn.textContent = "Verifying…";
    identityMsg.className = "form-status";
    identityMsg.textContent = "";

    fetch(WORKER_BASE_URL + "/verify-identity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstname: fields.firstName.el.value.trim(),
        lastname:  fields.lastName.el.value.trim(),
        dob:       fields.dob.el.value.trim(),
        vnin:      fields.vnin.el.value.trim(),
      }),
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        verifyBtn.disabled = false;
        if (d.verified) {
          verifyBtn.textContent = "Identity Verified ✓";
          verifyBtn.disabled = true;
          identityMsg.className = "form-status success";
          identityMsg.textContent = "Your identity has been verified.";

          if (typeof gtag === "function") gtag("event", "identity_verified", { form: "stage2_listing_form" });
          if (typeof fbq  === "function") fbq("trackCustom", "IdentityVerified");

          onIdentityVerified();
        } else {
          verifyBtn.textContent = "Verify My Identity";
          identityMsg.className = "form-status failure";
          identityMsg.textContent = "Verification failed — " + (d.reason || "no match") +
            (d.detail ? " | " + d.detail : "") + ". Please check your details and try again.";
        }
      })
      .catch(function () {
        verifyBtn.disabled = false;
        verifyBtn.textContent = "Verify My Identity";
        identityMsg.className = "form-status failure";
        identityMsg.textContent = "Verification request failed. Please try again.";
      });
  });

  // ── Called after identity is confirmed ───────────────────────
  function onIdentityVerified() {
    // Advance step indicator
    var s1 = document.getElementById("stepItem1");
    var s2 = document.getElementById("stepItem2");
    var c1 = document.getElementById("stepConn1");
    if (s1) { s1.classList.remove("active"); s1.classList.add("done"); }
    if (s2) s2.classList.add("active");
    if (c1) c1.classList.add("done");

    // Reveal step 2 and step 3 BEFORE loading scripts so the map container
    // has real pixel dimensions when Google Maps initialises.
    var step2 = document.getElementById("step2Section");
    var step3 = document.getElementById("step3Section");
    if (step2) step2.classList.remove("hidden");
    if (step3) step3.classList.remove("hidden");

    setTimeout(function () {
      if (step2) step2.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);

    // Load locationpicker.js first (defines window.initLocationMap),
    // then load Google Maps API (its callback fires initLocationMap),
    // then load step-2 logic in parallel.
    loadScript("locationpicker.js", function () {
      loadScript(
        "https://maps.googleapis.com/maps/api/js?v=3.55&key=" + MAPS_API_KEY + "&callback=initLocationMap"
      );
    });
    loadScript("listingform-step2.js");
  }

  function loadScript(src, onload) {
    var s = document.createElement("script");
    s.src = src;
    s.async = true;
    if (onload) s.onload = onload;
    document.head.appendChild(s);
  }
})();
