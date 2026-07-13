# CFA — Car Fluid Analyzer

AI surrogate for CFD: predicts a car's drag coefficient (Cd) from either
26 design parameters or an uploaded STL/OBJ mesh, and — when Cd runs
above target — suggests concrete geometry changes to reduce it.

Static frontend (no build step): `index.html`, `predict.html`, `upload.html`,
shared `style.css` / `script.js`.

**Status: frontend demo.** `script.js` currently ships a mock, rule-based
`predictCdFromParams()` / `predictCdFromFile()` standing in for the real
LightGBM/XGBoost baseline and PointNet models described in the PRD. Swap
those functions for real API calls once the backend is ready.

Based on the team PRD ("Cd 예측 Surrogate Model") and the DrivAerNet++
dataset (Elrefaie et al., 2024).
