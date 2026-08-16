(function () {
  const form = document.getElementById("leadForm");
  if (!form) return;

  const submitBtn = document.getElementById("submitBtn");
  const statusEl = document.getElementById("formStatus");

  const fields = {
    fullName: {
      input: document.getElementById("fullName"),
      group: document.getElementById("group-name"),
      validate: (v) => v.trim().length >= 2,
    },
    phone: {
      input: document.getElementById("phone"),
      group: document.getElementById("group-phone"),
      validate: (v) => /^[0-9+()\s-]{7,20}$/.test(v.trim()),
    },
    email: {
      input: document.getElementById("email"),
      group: document.getElementById("group-email"),
      validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
    },
  };

  function setError(field, hasError) {
    field.group.classList.toggle("has-error", hasError);
  }

  Object.values(fields).forEach((field) => {
    field.input.addEventListener("input", () => {
      if (field.group.classList.contains("has-error") && field.validate(field.input.value)) {
        setError(field, false);
      }
    });
  });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    let isValid = true;
    Object.values(fields).forEach((field) => {
      const valid = field.validate(field.input.value);
      setError(field, !valid);
      if (!valid) isValid = false;
    });

    if (!isValid) {
      statusEl.className = "form-status failure";
      statusEl.textContent = "Please correct the highlighted fields above.";
      return;
    }

    const payload = {
      fullName: fields.fullName.input.value.trim(),
      phone: fields.phone.input.value.trim(),
      email: fields.email.input.value.trim(),
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";
    statusEl.className = "form-status";
    statusEl.textContent = "";

    try {
      const response = await fetch("https://hook.us2.make.com/2akjrtnypro4leowb59akyb7om6h2hla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Request failed");

      if (typeof gtag === "function") {
        gtag("event", "generate_lead", { form: "stage1_lead_form" });
      }
      if (typeof fbq === "function") {
        fbq("track", "Lead");
      }

      window.location.href = "thankyou.html";
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit & Get My Secure Link";
      statusEl.className = "form-status failure";
      statusEl.textContent = "Something went wrong. Please try again in a moment.";
    }
  });
})();
