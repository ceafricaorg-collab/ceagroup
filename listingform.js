(function () {
  var WORKER_BASE_URL = "https://cea-listing-worker.ceafricaorg.workers.dev";
  var FLUTTERWAVE_PUBLIC_KEY = "FLWPUBK_TEST-a0fc74c6be11488a48e2c90ae540a4c3-X";

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

  if (!token) {
    showExpired();
    return;
  }

  fetch(WORKER_BASE_URL + "/verify-token?token=" + encodeURIComponent(token))
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data.valid) {
        showForm();
      } else {
        showExpired();
      }
    })
    .catch(showExpired);

  var form = document.getElementById("listingForm");
  if (!form) return;

  var submitBtn = document.getElementById("listingSubmitBtn");
  var statusEl = document.getElementById("listingFormStatus");
  var submitGateNote = document.getElementById("submitGateNote");

  // Inject upload progress bar after the submit button
  var progressWrap = document.createElement("div");
  progressWrap.id = "uploadProgressWrap";
  progressWrap.style.cssText = "display:none;margin:16px 0 8px;";
  progressWrap.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
      '<span id="uploadProgressMsg" style="font-size:13px;font-weight:600;color:var(--cea-navy);">Uploading files&hellip;</span>' +
      '<span id="uploadProgressPct" style="font-size:13px;font-weight:700;color:var(--cea-green);">0%</span>' +
    '</div>' +
    '<div style="background:#e3e7ed;border-radius:999px;height:10px;overflow:hidden;">' +
      '<div id="uploadProgressBar" style="height:100%;width:0%;background:var(--cea-green);border-radius:999px;transition:width 0.2s ease;"></div>' +
    '</div>' +
    '<p style="margin:8px 0 0;font-size:12px;color:var(--cea-muted);">Please keep this page open until the upload is complete.</p>';
  submitBtn.parentNode.insertBefore(progressWrap, submitBtn.nextSibling);

  var identityVerified = false;
  var paymentRef = null;

  function updateSubmitGate() {
    var ready = identityVerified && paymentRef !== null;
    submitBtn.disabled = !ready;
    submitGateNote.style.display = ready ? "none" : "block";
  }

  var fields = {
    propertyType: {
      input: document.getElementById("propertyType"),
      group: document.getElementById("group-propertyType"),
      validate: function (v) { return v.trim().length > 0; },
    },
    address: {
      input: document.getElementById("address"),
      group: document.getElementById("group-address"),
      validate: function (v) { return v.trim().length >= 5; },
    },
    location: {
      input: document.getElementById("latitude"),
      group: document.getElementById("group-location"),
      validate: function () {
        var lat = document.getElementById("latitude").value;
        var lng = document.getElementById("longitude").value;
        return lat !== "" && lng !== "";
      },
    },
    price: {
      input: document.getElementById("price"),
      group: document.getElementById("group-price"),
      validate: function (v) { return Number(v) > 0; },
    },
    description: {
      input: document.getElementById("description"),
      group: document.getElementById("group-description"),
      validate: function (v) { return v.trim().length >= 10; },
    },
    email: {
      input: document.getElementById("email"),
      group: document.getElementById("group-email"),
      validate: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); },
    },
    firstName: {
      input: document.getElementById("firstName"),
      group: document.getElementById("group-firstName"),
      validate: function (v) { return v.trim().length >= 2; },
    },
    lastName: {
      input: document.getElementById("lastName"),
      group: document.getElementById("group-lastName"),
      validate: function (v) { return v.trim().length >= 2; },
    },
    dob: {
      input: document.getElementById("dob"),
      group: document.getElementById("group-dob"),
      validate: function (v) { return v.trim().length > 0; },
    },
    vnin: {
      input: document.getElementById("vnin"),
      group: document.getElementById("group-vnin"),
      validate: function (v) { return v.trim().length >= 10; },
    },
    titleDocument: {
      input: document.getElementById("titleDocument"),
      group: document.getElementById("group-titleDocument"),
      validate: function () { return fields.titleDocument.input.files.length > 0; },
    },
    propertyPhotos: {
      input: document.getElementById("propertyPhotos"),
      group: document.getElementById("group-propertyPhotos"),
      validate: function () { return fields.propertyPhotos.input.files.length > 0; },
    },
  };

  function setError(field, hasError) {
    field.group.classList.toggle("has-error", hasError);
  }

  Object.keys(fields).forEach(function (key) {
    var field = fields[key];
    field.input.addEventListener("input", function () {
      if (field.group.classList.contains("has-error") && field.validate(field.input.value)) {
        setError(field, false);
      }
    });
  });

  // --- Identity verification (Virtual NIN) ---
  var verifyIdentityBtn = document.getElementById("verifyIdentityBtn");
  var identityStatusEl = document.getElementById("identityStatus");
  var identityFieldKeys = ["firstName", "lastName", "dob", "vnin"];

  verifyIdentityBtn.addEventListener("click", function () {
    var isValid = true;
    identityFieldKeys.forEach(function (key) {
      var field = fields[key];
      var valid = field.validate(field.input.value);
      setError(field, !valid);
      if (!valid) isValid = false;
    });

    if (!isValid) {
      identityStatusEl.className = "form-status failure";
      identityStatusEl.textContent = "Please correct the highlighted identity fields above.";
      return;
    }

    verifyIdentityBtn.disabled = true;
    verifyIdentityBtn.textContent = "Verifying...";
    identityStatusEl.className = "form-status";
    identityStatusEl.textContent = "";

    var identityPayload = {
      firstname: fields.firstName.input.value.trim(),
      lastname: fields.lastName.input.value.trim(),
      dob: fields.dob.input.value.trim(),
      vnin: fields.vnin.input.value.trim(),
    };

    fetch(WORKER_BASE_URL + "/verify-identity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(identityPayload),
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        verifyIdentityBtn.disabled = false;
        if (data.verified) {
          identityVerified = true;
          verifyIdentityBtn.textContent = "Identity Verified ✓";
          verifyIdentityBtn.disabled = true;
          identityStatusEl.className = "form-status success";
          identityStatusEl.textContent = "Your identity has been verified against your Virtual NIN.";
          if (typeof gtag === "function") {
            gtag("event", "identity_verified", { form: "stage2_listing_form" });
          }
          if (typeof fbq === "function") {
            fbq("trackCustom", "IdentityVerified");
          }

          // Advance step indicator
          var s1 = document.getElementById("stepItem1");
          var s2 = document.getElementById("stepItem2");
          var s3 = document.getElementById("stepItem3");
          var c1 = document.getElementById("stepConn1");
          var c2 = document.getElementById("stepConn2");
          if (s1) { s1.classList.remove("active"); s1.classList.add("done"); }
          if (s2) s2.classList.add("active");
          if (c1) c1.classList.add("done");

          // Reveal step 2 (property details) and step 3 (payment + submit)
          var step2 = document.getElementById("step2Section");
          var step3 = document.getElementById("step3Section");
          if (step2) {
            step2.classList.remove("hidden");
            // Map container was hidden on init — resize so it renders correctly
            setTimeout(function () {
              if (typeof window.ceaMapResize === "function") window.ceaMapResize();
              step2.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 150);
          }
          if (step3) step3.classList.remove("hidden");

          updateSubmitGate();
        } else {
          verifyIdentityBtn.textContent = "Verify My Identity";
          identityStatusEl.className = "form-status failure";
          identityStatusEl.textContent =
            "Verification failed — reason: " + (data.reason || "no match") +
            (data.detail ? " | detail: " + data.detail : "") +
            ". Please check your details and try again.";
        }
      })
      .catch(function () {
        verifyIdentityBtn.disabled = false;
        verifyIdentityBtn.textContent = "Verify My Identity";
        identityStatusEl.className = "form-status failure";
        identityStatusEl.textContent = "Verification request failed. Please try again.";
      });
  });

  // --- Payment (listing fee, waived/discounted automatically during an active promo) ---
  var payBtn = document.getElementById("payBtn");
  var paymentAmountText = document.getElementById("paymentAmountText");
  var paymentStatusEl = document.getElementById("paymentStatus");

  function computeFeeNaira() {
    var base = window.CEA_LISTING_FEE_NAIRA || 0;
    var promo = window.CEA_PROMO;
    if (!promo || !promo.enabled) return base;

    var now = Date.now();
    var start = new Date(promo.startDateTime).getTime();
    var end = new Date(promo.endDateTime).getTime();
    if (isNaN(start) || isNaN(end) || now < start || now > end) return base;

    if (promo.discountType === "free") return 0;
    if (promo.discountType === "percent") {
      var off = base * ((promo.discountValue || 0) / 100);
      return Math.max(0, Math.round(base - off));
    }
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
      var payerEmail = fields.email.input.value.trim();
      if (!fields.email.validate(payerEmail)) {
        setError(fields.email, true);
        paymentStatusEl.className = "form-status failure";
        paymentStatusEl.textContent = "Please enter a valid email address before paying.";
        return;
      }

      if (typeof FlutterwaveCheckout === "undefined") {
        paymentStatusEl.className = "form-status failure";
        paymentStatusEl.textContent = "Payment library failed to load. Please refresh and try again.";
        return;
      }

      var txRef = "CEA-" + Date.now();

      FlutterwaveCheckout({
        public_key: FLUTTERWAVE_PUBLIC_KEY,
        tx_ref: txRef,
        amount: feeNaira,
        currency: "NGN",
        payment_options: "card, banktransfer, ussd",
        customer: {
          email: payerEmail,
          name: (fields.firstName.input.value.trim() + " " + fields.lastName.input.value.trim()).trim(),
        },
        customizations: {
          title: "CEA Property Listing Fee",
          description: "Listing fee for property submission",
        },
        callback: function (response) {
          // Flutterwave returns "successful" in live mode and sometimes "completed" in test mode
          var ok = response.status === "successful" || response.status === "completed";
          if (!ok) {
            paymentStatusEl.className = "form-status failure";
            paymentStatusEl.textContent = "Payment was not completed. Please try again.";
            return;
          }
          paymentRef = String(response.transaction_id || response.flw_ref || txRef);
          paymentStatusEl.className = "form-status success";
          paymentStatusEl.textContent = "Payment received. Reference: " + txRef;
          payBtn.textContent = "Paid ✓";
          payBtn.disabled = true;

          // Advance step indicator to step 3
          var s2done = document.getElementById("stepItem2");
          var s3active = document.getElementById("stepItem3");
          var c2done = document.getElementById("stepConn2");
          if (s2done) { s2done.classList.remove("active"); s2done.classList.add("done"); }
          if (s3active) s3active.classList.add("active");
          if (c2done) c2done.classList.add("done");

          if (typeof gtag === "function") {
            gtag("event", "purchase", {
              transaction_id: paymentRef,
              value: feeNaira,
              currency: "NGN",
            });
          }
          if (typeof fbq === "function") {
            fbq("track", "Purchase", { value: feeNaira, currency: "NGN" });
          }
          updateSubmitGate();
        },
        onclose: function () {
          // onclose fires after callback too — only show error if payment was not captured
          setTimeout(function () {
            if (paymentRef === null) {
              paymentStatusEl.className = "form-status failure";
              paymentStatusEl.textContent = "Payment window closed before completion. Please try again.";
            }
          }, 300);
        },
      });
    });
  }

  // --- Final submission with XHR upload progress ---
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    if (!identityVerified) {
      statusEl.className = "form-status failure";
      statusEl.textContent = "Please verify your identity before submitting.";
      return;
    }
    if (paymentRef === null) {
      statusEl.className = "form-status failure";
      statusEl.textContent = "Please complete payment before submitting.";
      return;
    }

    var isValid = true;
    Object.keys(fields).forEach(function (key) {
      var field = fields[key];
      var valid = field.validate(field.input.value);
      setError(field, !valid);
      if (!valid) isValid = false;
    });

    if (!isValid) {
      statusEl.className = "form-status failure";
      statusEl.textContent = "Please correct the highlighted fields above.";
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Starting upload...";
    statusEl.className = "form-status";
    statusEl.textContent = "";

    // Show progress bar
    progressWrap.style.display = "block";
    var progressBar = document.getElementById("uploadProgressBar");
    var progressPct = document.getElementById("uploadProgressPct");
    var progressMsg = document.getElementById("uploadProgressMsg");

    var formData = new FormData(form);
    formData.append("token", token);
    formData.append("flwTransactionId", paymentRef);
    formData.append("feePaidNaira", String(feeNaira));

    var xhr = new XMLHttpRequest();
    xhr.open("POST", WORKER_BASE_URL + "/submit-listing");

    xhr.upload.onprogress = function (ev) {
      if (!ev.lengthComputable) return;
      var pct = Math.round((ev.loaded / ev.total) * 100);
      if (progressBar) progressBar.style.width = pct + "%";
      if (progressPct) progressPct.textContent = pct + "%";
      if (pct < 100) {
        submitBtn.textContent = "Uploading " + pct + "%…";
      } else {
        submitBtn.textContent = "Processing…";
        if (progressMsg) progressMsg.textContent = "Files uploaded — finalising your submission…";
        if (progressPct) progressPct.textContent = "Done";
      }
    };

    xhr.onload = function () {
      progressWrap.style.display = "none";
      var data;
      try {
        data = JSON.parse(xhr.responseText);
      } catch (err) {
        data = {};
      }
      if (xhr.status < 200 || xhr.status >= 300 || !data.ok) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Listing for Verification";
        statusEl.className = "form-status failure";
        statusEl.textContent = "Something went wrong. Please try again in a moment.";
        return;
      }
      if (typeof gtag === "function") {
        gtag("event", "listing_submitted", { form: "stage2_listing_form" });
      }
      if (typeof fbq === "function") {
        fbq("trackCustom", "ListingSubmitted");
      }
      window.location.href = "listing-thankyou.html";
    };

    xhr.onerror = function () {
      progressWrap.style.display = "none";
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Listing for Verification";
      statusEl.className = "form-status failure";
      statusEl.textContent = "Something went wrong. Please try again in a moment.";
    };

    xhr.send(formData);
  });
})();
