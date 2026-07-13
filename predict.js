/* predict.html — parameter form wiring */
(function () {
  const form = document.getElementById("predict-form");
  const panel = document.getElementById("result-panel");
  const btn = document.getElementById("predict-btn");
  if (!form) return;

  function readParams() {
    const fd = new FormData(form);
    const num = (k) => parseFloat(fd.get(k));
    return {
      carType: fd.get("carType"),
      underbody: fd.get("underbody"),
      wheelDesign: fd.get("wheelDesign"),
      carLength: num("carLength"),
      carWidth: num("carWidth"),
      carRoofHeight: num("carRoofHeight"),
      wheelbase: num("wheelbase"),
      frontOverhang: num("frontOverhang"),
      rearOverhang: num("rearOverhang"),
      groundClearance: num("groundClearance"),
      windscreenLength: num("windscreenLength"),
      windscreenWidth: num("windscreenWidth"),
      windscreenIncl: num("windscreenIncl"),
      aPillarThickness: num("aPillarThickness"),
      rearWindowLength: num("rearWindowLength"),
      rearWindowIncl: num("rearWindowIncl"),
      trunklidLength: num("trunklidLength"),
      trunklidAngle: num("trunklidAngle"),
      rampAngle: num("rampAngle"),
      diffusorAngle: num("diffusorAngle"),
      bumperLength: num("bumperLength"),
      bumperCurvature: num("bumperCurvature"),
      mirrorX: num("mirrorX"),
      mirrorZ: num("mirrorZ"),
      doorHandleX: num("doorHandleX"),
      doorHandleZ: num("doorHandleZ"),
    };
  }

  function renderLoading() {
    panel.innerHTML = `
      <div class="result-loading">
        <div class="spinner"></div>
        Running baseline model…
      </div>`;
  }

  function renderResult(result) {
    const badge = cdBadgeClass(result.cd);
    const badgeText =
      badge === "badge-good" ? "Low drag" : badge === "badge-ok" ? "Near target" : "Above target";
    const recos = buildRecommendations(result);

    panel.innerHTML = `
      <div class="mock-notice">Demo mode — this is a mock prediction, not the trained LightGBM/XGBoost model.</div>
      <div class="result-header">
        <div>
          <div class="cd-label">Predicted drag coefficient</div>
          <div class="cd-value">${formatCd(result.cd)}</div>
        </div>
        <span class="badge ${badge}">${badgeText}</span>
      </div>
      <div class="confidence-row">
        <div><strong>±${result.mae.toFixed(3)}</strong>MAE</div>
        <div><strong>${result.r2.toFixed(2)}</strong>R² (test split)</div>
        <div><strong>${CD_DATASET_RANGE.min.toFixed(2)}–${CD_DATASET_RANGE.max.toFixed(2)}</strong>dataset range</div>
      </div>
      ${
        recos.length
          ? `<div class="reco-list">
              <h4>⚠️ Suggested changes to reduce Cd</h4>
              <div class="reco-sub">Ranked by estimated contribution to your current drag coefficient.</div>
              ${recos
                .map(
                  (r) => `
                <div class="reco-item">
                  <div class="reco-rank">${r.rank}</div>
                  <div class="reco-body">
                    <div class="reco-issue">${r.issue}</div>
                    <p>${r.suggestion}</p>
                    <div class="reco-impact">Estimated impact: ${r.estImpact}</div>
                  </div>
                </div>`
                )
                .join("")}
            </div>`
          : `<div class="reco-list"><h4>✅ Within target range</h4><div class="reco-sub">No high-impact changes flagged for this design.</div></div>`
      }
      <div class="result-source">Model: ${result.source} · Trained on DrivAerNet++ (Elrefaie et al., 2024)</div>
    `;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    btn.disabled = true;
    btn.textContent = "Predicting…";
    renderLoading();

    const params = readParams();
    setTimeout(() => {
      const result = predictCdFromParams(params);
      renderResult(result);
      btn.disabled = false;
      btn.textContent = "Predict Cd";
    }, 900);
  });

  form.addEventListener("reset", () => {
    setTimeout(() => {
      panel.innerHTML = `<div class="result-empty">Fill in the parameters and hit <strong>Predict Cd</strong> to see a result here.</div>`;
    }, 0);
  });
})();
