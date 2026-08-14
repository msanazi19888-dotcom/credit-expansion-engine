// ============================================================
// CONFIG — set this to your deployed FastAPI backend's base URL
// once you've hosted it (e.g. Render, Railway, Fly.io).
// Example: "https://credit-expansion-engine-api.onrender.com"
// ============================================================
const API_BASE_URL = "https://credit-expansion-engine-api.onrender.com";

// ---------- Scroll reveal (respects prefers-reduced-motion via CSS) ----------
(function () {
  const revealEls = document.querySelectorAll(".reveal");
  if (!revealEls.length || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
  );
  revealEls.forEach((el) => io.observe(el));
})();

// ---------- Active section highlighting in the side rail ----------
(function () {
  const railLinks = document.querySelectorAll(".rail a");
  if (!railLinks.length) return;
  const sections = Array.from(railLinks)
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);
  if (!("IntersectionObserver" in window)) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const id = "#" + entry.target.id;
        const link = document.querySelector(`.rail a[href="${id}"]`);
        if (!link) return;
        if (entry.isIntersecting) {
          railLinks.forEach((l) => l.classList.remove("active"));
          link.classList.add("active");
        }
      });
    },
    { rootMargin: "-30% 0px -60% 0px" }
  );
  sections.forEach((s) => io.observe(s));
})();

// ---------- Demo form ----------
(function () {
  const form = document.getElementById("score-form");
  if (!form) return; // not on the demo page

  const apiDisplay = document.getElementById("api-url-display");
  if (apiDisplay) {
    apiDisplay.textContent = API_BASE_URL ? API_BASE_URL + "/score" : "not configured";
  }

  const EXAMPLE = {
    loan_amnt: 12000, int_rate: 13.5, installment: 407.23, purpose: "debt_consolidation",
    grade: "C", sub_grade: "3", annual_inc: 55000, home_ownership: "RENT",
    emp_length: "5 years", verification_status: "Verified", fico: 682, dti: 22.4,
    revol_util: 48.2, revol_bal: 9500, delinq_2yrs: 0, inq_last_6mths: 1,
    open_acc: 8, total_acc: 18, pub_rec: 0,
  };

  function applyExample() {
    Object.entries(EXAMPLE).forEach(([key, val]) => {
      const el = document.getElementById(key);
      if (el) el.value = val;
    });
  }

  document.getElementById("reset-btn").addEventListener("click", applyExample);

  function buildPayload() {
    const val = (id) => document.getElementById(id).value;
    const num = (id) => Number(document.getElementById(id).value);
    const ficoLow = num("fico");
    return {
      loan_amnt: num("loan_amnt"),
      int_rate: num("int_rate"),
      installment: num("installment"),
      grade: val("grade"),
      sub_grade: val("grade") + val("sub_grade"),
      home_ownership: val("home_ownership"),
      annual_inc: num("annual_inc"),
      verification_status: val("verification_status"),
      purpose: val("purpose"),
      dti: num("dti"),
      delinq_2yrs: num("delinq_2yrs"),
      inq_last_6mths: num("inq_last_6mths"),
      open_acc: num("open_acc"),
      pub_rec: num("pub_rec"),
      revol_bal: num("revol_bal"),
      revol_util: num("revol_util"),
      total_acc: num("total_acc"),
      emp_length: val("emp_length"),
      fico_range_low: ficoLow,
      fico_range_high: ficoLow + 4,
    };
  }

  function renderResult(data) {
    const container = document.getElementById("result-container");
    const pdPct = (data.calibrated_pd * 100).toFixed(1);
    const thresholdPct = (data.threshold_used * 100).toFixed(1);
    const approved = data.decision === "Approved";

    let reasonsHtml = "";
    if (!approved && data.reason_codes && data.reason_codes.length) {
      reasonsHtml = `
        <div class="letter" style="margin-top:16px;">
          <p style="margin-bottom:8px;"><strong>This decision was based in part on:</strong></p>
          <ul>${data.reason_codes.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>
        </div>`;
    }

    let unmappedHtml = "";
    if (data.unmapped_features_flagged_for_review && data.unmapped_features_flagged_for_review.length) {
      unmappedHtml = `<div class="note" style="margin-top:14px;">Flagged for compliance review (not shown to applicant): ${data.unmapped_features_flagged_for_review.map(escapeHtml).join(", ")}</div>`;
    }

    container.innerHTML = `
      <div class="result-card">
        <div class="letter-head" style="border:none; padding:0; margin:0;">
          <span class="mono" style="font-size:12px; color:var(--ink-faint);">SCORING RESULT</span>
          <span class="decision-badge ${approved ? "approved" : "declined"}">${data.decision.toUpperCase()}</span>
        </div>
        <div class="pd-gauge">
          <div class="pd-number ${approved ? "" : "correction"}">${pdPct}%</div>
          <div style="font-size:12.5px; color:var(--ink-soft); margin-bottom:8px;">estimated probability of default</div>
          <div class="track"><div class="fill" style="width:${Math.min(pdPct, 100)}%; background:${approved ? "#1F5C46" : "#9C3B2E"};"></div></div>
          <div class="marks"><span>0%</span><span>Threshold: ${thresholdPct}%</span><span>100%</span></div>
        </div>
        ${reasonsHtml}
        ${unmappedHtml}
      </div>`;
  }

  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  function renderError(message) {
    document.getElementById("form-error").innerHTML = `<div class="error-box">${escapeHtml(message)}</div>`;
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    document.getElementById("form-error").innerHTML = "";

    if (!API_BASE_URL) {
      renderError(
        "The scoring backend isn't configured yet. Deploy src/api.py (see the deployment guide), then set API_BASE_URL at the top of script.js to your backend's live URL."
      );
      return;
    }

    const btn = document.getElementById("submit-btn");
    btn.disabled = true;
    btn.textContent = "Scoring…";

    try {
      const res = await fetch(API_BASE_URL + "/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail ? JSON.stringify(errBody.detail) : `Request failed (${res.status})`);
      }
      const data = await res.json();
      renderResult(data);
    } catch (err) {
      renderError("Couldn't reach the scoring endpoint: " + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "Score this application →";
    }
  });
})();
