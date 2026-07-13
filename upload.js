/* upload.html — STL/OBJ dropzone wiring */
(function () {
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("file-input");
  const fileInfo = document.getElementById("file-info");
  const predictBtn = document.getElementById("upload-predict-btn");
  const clearBtn = document.getElementById("clear-btn");
  const panel = document.getElementById("result-panel");
  if (!dropzone) return;

  let currentFile = null;

  function setFile(file) {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["stl", "obj"].includes(ext)) {
      fileInfo.innerHTML = `<div class="mock-notice">Unsupported file type ".${ext}" — please upload an .stl or .obj file.</div>`;
      currentFile = null;
      predictBtn.disabled = true;
      clearBtn.style.display = "none";
      return;
    }
    currentFile = file;
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    fileInfo.innerHTML = `
      <div class="file-chip">
        <span>📄 ${file.name} · ${sizeMB} MB</span>
      </div>`;
    predictBtn.disabled = false;
    clearBtn.style.display = "inline-block";
  }

  function clearFile() {
    currentFile = null;
    fileInput.value = "";
    fileInfo.innerHTML = "";
    predictBtn.disabled = true;
    clearBtn.style.display = "none";
    panel.innerHTML = `<div class="result-empty">Upload a mesh and hit <strong>Predict Cd</strong> to see a result here.</div>`;
  }

  dropzone.addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener("change", (e) => setFile(e.target.files[0]));

  ["dragenter", "dragover"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    })
  );
  ["dragleave", "drop"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
    })
  );
  dropzone.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files[0];
    setFile(file);
  });

  clearBtn.addEventListener("click", clearFile);

  function renderLoading() {
    panel.innerHTML = `
      <div class="result-loading">
        <div class="spinner"></div>
        Converting mesh to point cloud &amp; running PointNet…
      </div>`;
  }

  function renderResult(result) {
    const badge = cdBadgeClass(result.cd);
    const badgeText =
      badge === "badge-good" ? "Low drag" : badge === "badge-ok" ? "Near target" : "Above target";
    const recos = buildRecommendations(result);

    panel.innerHTML = `
      <div class="mock-notice">Demo mode — this is a mock prediction, not the trained PointNet model.</div>
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
          : `<div class="reco-list"><h4>✅ Within target range</h4><div class="reco-sub">No high-impact shape issues flagged for this mesh.</div></div>`
      }
      <div class="result-source">Model: ${result.source} · Trained on DrivAerNet++ (Elrefaie et al., 2024)</div>
    `;
  }

  predictBtn.addEventListener("click", () => {
    if (!currentFile) return;
    predictBtn.disabled = true;
    predictBtn.textContent = "Predicting…";
    renderLoading();

    setTimeout(() => {
      const result = predictCdFromFile(currentFile);
      renderResult(result);
      predictBtn.disabled = false;
      predictBtn.textContent = "Predict Cd";
    }, 1300);
  });
})();
