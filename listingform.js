(function () {
  var WORKER_BASE_URL = "https://cea-listing-worker.ceafricaorg.workers.dev";
  var FLUTTERWAVE_PUBLIC_KEY = "FLWPUBK_TEST-a0fc74c6be11488a48e2c90ae540a4c3-X";

  var loadingState  = document.getElementById("loadingState");
  var expiredState  = document.getElementById("expiredState");
  var formSection   = document.getElementById("listingFormSection");

  var params = new URLSearchParams(window.location.search);
  var token  = params.get("token");

  function showExpired() {
    loadingState.style.display = "none";
    formSection.style.display  = "none";
    expiredState.style.display = "flex";
  }

  function showForm() {
    loadingState.style.display = "none";
    expiredState.style.display = "none";
    formSection.style.display  = "block";
  }

  if (!token) { showExpired(); return; }

  fetch(WORKER_BASE_URL + "/verify-token?token=" + encodeURIComponent(token))
    .then(function (r) { return r.json(); })
    .then(function (d) { if (d.valid) showForm(); else showExpired(); })
    .catch(showExpired);

  // ── Identity fields ───────────────────────────────────────────
  var identityFields = {
    email:     { el: document.getElementById("email"),     group: document.getElementById("group-email"),     ok: function(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); } },
    firstName: { el: document.getElementById("firstName"), group: document.getElementById("group-firstName"), ok: function(v){ return v.trim().length >= 2; } },
    lastName:  { el: document.getElementById("lastName"),  group: document.getElementById("group-lastName"),  ok: function(v){ return v.trim().length >= 2; } },
    dob:       { el: document.getElementById("dob"),       group: document.getElementById("group-dob"),       ok: function(v){ return v.trim().length > 0; } },
    vnin:      { el: document.getElementById("vnin"),      group: document.getElementById("group-vnin"),      ok: function(v){ return v.trim().length >= 10; } },
  };

  function setError(group, on) { group.classList.toggle("has-error", on); }

  Object.keys(identityFields).forEach(function (k) {
    var f = identityFields[k];
    f.el.addEventListener("input", function () {
      if (f.group.classList.contains("has-error") && f.ok(f.el.value)) setError(f.group, false);
    });
  });

  var verifyBtn   = document.getElementById("verifyIdentityBtn");
  var identityMsg = document.getElementById("identityStatus");

  verifyBtn.addEventListener("click", function () {
    var valid = true;
    Object.keys(identityFields).forEach(function (k) {
      var ok = identityFields[k].ok(identityFields[k].el.value);
      setError(identityFields[k].group, !ok);
      if (!ok) valid = false;
    });
    if (!valid) {
      identityMsg.className   = "form-status failure";
      identityMsg.textContent = "Please correct the highlighted fields above.";
      return;
    }

    verifyBtn.disabled    = true;
    verifyBtn.textContent = "Verifying…";
    identityMsg.className   = "form-status";
    identityMsg.textContent = "";

    fetch(WORKER_BASE_URL + "/verify-identity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstname: identityFields.firstName.el.value.trim(),
        lastname:  identityFields.lastName.el.value.trim(),
        dob:       identityFields.dob.el.value.trim(),
        vnin:      identityFields.vnin.el.value.trim(),
      }),
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        verifyBtn.disabled = false;
        if (d.verified) {
          verifyBtn.textContent = "Identity Verified ✓";
          verifyBtn.disabled    = true;
          identityMsg.className   = "form-status success";
          identityMsg.textContent = "Your identity has been verified.";

          if (typeof gtag === "function") gtag("event", "identity_verified", { form: "stage2_listing_form" });
          if (typeof fbq  === "function") fbq("trackCustom", "IdentityVerified");

          onIdentityVerified();
        } else {
          verifyBtn.textContent = "Verify My Identity";
          identityMsg.className   = "form-status failure";
          identityMsg.textContent = "Verification failed — " + (d.reason || "no match") +
            (d.detail ? " | " + d.detail : "") + ". Please check your details and try again.";
        }
      })
      .catch(function () {
        verifyBtn.disabled    = false;
        verifyBtn.textContent = "Verify My Identity";
        identityMsg.className   = "form-status failure";
        identityMsg.textContent = "Verification request failed. Please try again.";
      });
  });

  function onIdentityVerified() {
    // Show verified banner
    var banner = document.getElementById("verifiedBanner");
    if (banner) banner.classList.add("show");

    // Advance step indicator
    var s1 = document.getElementById("stepItem1");
    var s2 = document.getElementById("stepItem2");
    var c1 = document.getElementById("stepConn1");
    if (s1) { s1.classList.remove("active"); s1.classList.add("done"); }
    if (s2) s2.classList.add("active");
    if (c1) c1.classList.add("done");

    // Scroll down to property section
    var hr = document.querySelector(".form-section-divider");
    if (hr) setTimeout(function () {
      hr.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);

    updateSubmitGate();
  }

  // ── Property field validation ─────────────────────────────────
  var propFields = {
    propertyType: { el: document.getElementById("propertyType"), group: document.getElementById("group-propertyType"), ok: function(v){ return v.trim().length > 0; } },
    address:      { el: document.getElementById("address"),      group: document.getElementById("group-address"),      ok: function(v){ return v.trim().length >= 5; } },
    location: {
      el:    document.getElementById("latitude"),
      group: document.getElementById("group-location"),
      ok:    function () {
        return document.getElementById("latitude").value !== "" &&
               document.getElementById("longitude").value !== "";
      },
    },
    price:       { el: document.getElementById("price"),       group: document.getElementById("group-price"),       ok: function(v){ return Number(v) > 0; } },
    description: { el: document.getElementById("description"), group: document.getElementById("group-description"), ok: function(v){ return v.trim().length >= 10; } },
    titleDocument: {
      el: document.getElementById("titleDocument"), group: document.getElementById("group-titleDocument"),
      ok: function () { return propFields.titleDocument.el.files.length > 0; },
    },
    propertyPhotos: {
      el: document.getElementById("propertyPhotos"), group: document.getElementById("group-propertyPhotos"),
      ok: function () { return propFields.propertyPhotos.el.files.length > 0; },
    },
  };

  Object.keys(propFields).forEach(function (k) {
    var f = propFields[k];
    f.el.addEventListener("input", function () {
      if (f.group.classList.contains("has-error") && f.ok(f.el.value)) setError(f.group, false);
    });
  });

  // ── Submit gate ───────────────────────────────────────────────
  var submitBtn     = document.getElementById("listingSubmitBtn");
  var submitGateNote = document.getElementById("submitGateNote");
  var paymentRef    = null;

  function updateSubmitGate() {
    var ready = paymentRef !== null;
    submitBtn.disabled          = !ready;
    submitGateNote.style.display = ready ? "none" : "block";
  }

  // ── Payment ───────────────────────────────────────────────────
  var payBtn            = document.getElementById("payBtn");
  var paymentAmountText = document.getElementById("paymentAmountText");
  var paymentStatusEl   = document.getElementById("paymentStatus");

  function computeFeeNaira() {
    var base  = window.CEA_LISTING_FEE_NAIRA || 0;
    var promo = window.CEA_PROMO;
    if (!promo || !promo.enabled) return base;
    var now   = Date.now();
    var start = new Date(promo.startDateTime).getTime();
    var end   = new Date(promo.endDateTime).getTime();
    if (isNaN(start) || isNaN(end) || now < start || now > end) return base;
    if (promo.discountType === "free") return 0;
    if (promo.discountType === "percent") return Math.max(0, Math.round(base - base * ((promo.discountValue || 0) / 100)));
    return base;
  }

  var feeNaira = computeFeeNaira();

  if (feeNaira <= 0) {
    paymentAmountText.textContent = "Your listing fee is currently waived by an active promotion. No payment required.";
    payBtn.style.display = "none";
    paymentRef = "FREE";
    updateSubmitGate();
  } else {
    paymentAmountText.textContent = "Listing fee: ₦" + feeNaira.toLocaleString() + ". Payment is required before your listing is submitted for verification.";
    payBtn.disabled = false;
    payBtn.addEventListener("click", function () {
      var payerEmail = identityFields.email.el.value.trim();
      if (!identityFields.email.ok(payerEmail)) {
        setError(identityFields.email.group, true);
        paymentStatusEl.className   = "form-status failure";
        paymentStatusEl.textContent = "Please enter a valid email address before paying.";
        return;
      }
      if (typeof FlutterwaveCheckout === "undefined") {
        paymentStatusEl.className   = "form-status failure";
        paymentStatusEl.textContent = "Payment library failed to load. Please refresh and try again.";
        return;
      }

      var txRef = "CEA-" + Date.now();

      FlutterwaveCheckout({
        public_key:      FLUTTERWAVE_PUBLIC_KEY,
        tx_ref:          txRef,
        amount:          feeNaira,
        currency:        "NGN",
        payment_options: "card, banktransfer, ussd",
        customer: {
          email: payerEmail,
          name:  (identityFields.firstName.el.value.trim() + " " + identityFields.lastName.el.value.trim()).trim(),
        },
        customizations: {
          title:       "CEA Property Listing Fee",
          description: "Listing fee for property submission",
        },
        callback: function (response) {
          var ok = response.status === "successful" || response.status === "completed";
          if (!ok) {
            paymentStatusEl.className   = "form-status failure";
            paymentStatusEl.textContent = "Payment was not completed (status: " + (response.status || "unknown") + "). Please try again.";
            return;
          }
          paymentRef = String(response.transaction_id || response.flw_ref || txRef);
          paymentStatusEl.className   = "form-status success";
          paymentStatusEl.textContent = "Payment received. Reference: " + txRef;
          payBtn.textContent = "Paid ✓";
          payBtn.disabled    = true;

          // Advance step indicator to step 3
          var s2 = document.getElementById("stepItem2");
          var s3 = document.getElementById("stepItem3");
          var c2 = document.getElementById("stepConn2");
          if (s2) { s2.classList.remove("active"); s2.classList.add("done"); }
          if (s3) s3.classList.add("active");
          if (c2) c2.classList.add("done");

          if (typeof gtag === "function") gtag("event", "purchase", { transaction_id: paymentRef, value: feeNaira, currency: "NGN" });
          if (typeof fbq  === "function") fbq("track", "Purchase", { value: feeNaira, currency: "NGN" });
          updateSubmitGate();
        },
        onclose: function () {
          setTimeout(function () {
            if (paymentRef === null) {
              paymentStatusEl.className   = "form-status failure";
              paymentStatusEl.textContent = "Payment window closed. If you completed the payment, please wait a moment and try clicking the Pay button again.";
            }
          }, 1000);
        },
      });
    });
  }

  // ── Upload progress bar ───────────────────────────────────────
  var progressWrap = document.createElement("div");
  progressWrap.id = "uploadProgressWrap";
  progressWrap.style.cssText = "display:none;margin:16px 0 8px;";
  progressWrap.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
      '<span id="uploadProgressMsg" style="font-size:13px;font-weight:600;color:var(--cea-navy);">Uploading files…</span>' +
      '<span id="uploadProgressPct" style="font-size:13px;font-weight:700;color:var(--cea-green);">0%</span>' +
    '</div>' +
    '<div style="background:#e3e7ed;border-radius:999px;height:10px;overflow:hidden;">' +
      '<div id="uploadProgressBar" style="height:100%;width:0%;background:var(--cea-green);border-radius:999px;transition:width 0.2s ease;"></div>' +
    '</div>' +
    '<p style="margin:8px 0 0;font-size:12px;color:var(--cea-muted);">Please keep this page open until the upload is complete.</p>';
  submitBtn.parentNode.insertBefore(progressWrap, submitBtn.nextSibling);

  // ── Final submission ──────────────────────────────────────────
  var form     = document.getElementById("listingForm");
  var statusEl = document.getElementById("listingFormStatus");

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    if (paymentRef === null) {
      statusEl.className   = "form-status failure";
      statusEl.textContent = "Please complete payment before submitting.";
      return;
    }

    var isValid = true;
    Object.keys(propFields).forEach(function (k) {
      var f     = propFields[k];
      var valid = f.ok(f.el.value);
      setError(f.group, !valid);
      if (!valid) isValid = false;
    });
    if (!isValid) {
      statusEl.className   = "form-status failure";
      statusEl.textContent = "Please correct the highlighted fields above.";
      return;
    }

    submitBtn.disabled    = true;
    submitBtn.textContent = "Starting upload…";
    statusEl.className   = "form-status";
    statusEl.textContent = "";
    progressWrap.style.display = "block";

    var progressBar = document.getElementById("uploadProgressBar");
    var progressPct = document.getElementById("uploadProgressPct");
    var progressMsg = document.getElementById("uploadProgressMsg");

    var formData = new FormData(form);
    formData.append("token",          token);
    formData.append("flwTransactionId", paymentRef);
    formData.append("feePaidNaira",   String(feeNaira));

    var xhr = new XMLHttpRequest();
    xhr.open("POST", WORKER_BASE_URL + "/submit-listing");

    xhr.upload.onprogress = function (ev) {
      if (!ev.lengthComputable) return;
      var pct = Math.round((ev.loaded / ev.total) * 100);
      if (progressBar) progressBar.style.width = pct + "%";
      if (progressPct) progressPct.textContent  = pct + "%";
      submitBtn.textContent = pct < 100 ? "Uploading " + pct + "%…" : "Processing…";
      if (pct === 100) {
        if (progressMsg) progressMsg.textContent = "Files uploaded — finalising your submission…";
        if (progressPct) progressPct.textContent  = "Done";
      }
    };

    xhr.onload = function () {
      progressWrap.style.display = "none";
      var data;
      try { data = JSON.parse(xhr.responseText); } catch (e) { data = {}; }
      if (xhr.status < 200 || xhr.status >= 300 || !data.ok) {
        submitBtn.disabled    = false;
        submitBtn.textContent = "Submit Listing for Verification";
        statusEl.className    = "form-status failure";
        statusEl.textContent  = "Something went wrong. Please try again in a moment.";
        return;
      }
      if (typeof gtag === "function") gtag("event", "listing_submitted", { form: "stage2_listing_form" });
      if (typeof fbq  === "function") fbq("trackCustom", "ListingSubmitted");
      window.location.href = "listing-thankyou.html";
    };

    xhr.onerror = function () {
      progressWrap.style.display = "none";
      submitBtn.disabled    = false;
      submitBtn.textContent = "Submit Listing for Verification";
      statusEl.className    = "form-status failure";
      statusEl.textContent  = "Something went wrong. Please try again in a moment.";
    };

    xhr.send(formData);
  });
})();
