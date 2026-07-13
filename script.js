/* ============================================================
   CFA — Car Fluid Analyzer
   Shared logic: mobile nav, mock Cd prediction model, and
   LLM-style recommendation generator.

   NOTE: predictCd() below is a MOCK model for frontend/demo
   purposes only. It approximates plausible aerodynamic trends
   from the DrivAerNet++ parameter set (see PRD) but is NOT a
   trained ML model. Swap PREDICT_ENDPOINT + callPredictAPI()
   with the real LightGBM/PointNet backend when ready.
   ============================================================ */

const CD_TARGET_THRESHOLD = 0.26; // above this, we surface recommendations
const CD_DATASET_RANGE = { min: 0.20, max: 0.32, mean: 0.254 };

/* Baseline mean Cd per body type, from the team's own EDA
   (see slide "Estateback designs have clearly higher drag") */
const BODY_TYPE_BASELINE = {
  fastback: 0.244,
  notchback: 0.246,
  estateback: 0.272,
};

/* ---------- Mobile nav toggle ---------- */
function initNav() {
  const toggle = document.querySelector(".nav-toggle");
  const menu = document.querySelector(".navbar");
  if (!toggle || !menu) return;
  toggle.addEventListener("click", () => {
    menu.classList.toggle("nav-open");
    toggle.setAttribute(
      "aria-expanded",
      menu.classList.contains("nav-open") ? "true" : "false"
    );
  });
}

/* ---------- Mock prediction model ---------- */
/**
 * Very small, rule-based approximation of a Cd surrogate model.
 * Combines a body-type baseline with directional nudges from
 * a handful of aerodynamically meaningful parameters, then adds
 * a small amount of noise so repeated runs feel model-like.
 */
function predictCdFromParams(p) {
  let cd = BODY_TYPE_BASELINE[p.carType] ?? CD_DATASET_RANGE.mean;

  const contributions = [];

  const pushEffect = (label, delta, paramKey, direction) => {
    cd += delta;
    if (Math.abs(delta) > 0.0015) {
      contributions.push({ label, delta, paramKey, direction });
    }
  };

  // Frontal area proxy: wider + taller => more drag
  const frontalArea = (p.carWidth / 1850) * (p.carRoofHeight / 1450);
  pushEffect(
    "Large frontal area (width × height)",
    (frontalArea - 1) * 0.028,
    "carWidth",
    "decrease width or roof height"
  );

  // Windscreen inclination: more upright (higher angle from horizontal) => more drag
  pushEffect(
    "Upright windscreen inclination",
    (p.windscreenIncl - 32) * 0.0009,
    "windscreenIncl",
    "rake the windscreen back further"
  );

  // Ramp angle: steeper rear ramp => more drag
  pushEffect(
    "Steep rear ramp angle",
    (p.rampAngle - 16) * 0.0012,
    "rampAngle",
    "reduce the rear ramp angle"
  );

  // Diffusor angle: bigger diffusor angle => better underbody flow => less drag
  pushEffect(
    "Underdeveloped rear diffusor",
    (6 - p.diffusorAngle) * 0.0011,
    "diffusorAngle",
    "increase the rear diffusor angle"
  );

  // Front bumper curvature: boxier (lower curvature) => more drag
  pushEffect(
    "Boxy front bumper (low curvature)",
    (0.5 - p.bumperCurvature) * 0.02,
    "bumperCurvature",
    "increase front bumper curvature / rounding"
  );

  // Front bumper length: longer overhang => slightly more drag
  pushEffect(
    "Long front bumper overhang",
    (p.bumperLength - 450) * 0.00004,
    "bumperLength",
    "shorten the front bumper length"
  );

  // Ground clearance: higher clearance => more underbody turbulence => more drag
  pushEffect(
    "High ground clearance",
    (p.groundClearance - 150) * 0.0003,
    "groundClearance",
    "lower ride height / ground clearance"
  );

  // Underbody type
  if (p.underbody === "standard") {
    pushEffect(
      "Non-flat (standard) underbody",
      0.006,
      "underbody",
      "switch to a flat underbody panel"
    );
  }

  // Wheel design
  if (p.wheelDesign === "standard") {
    pushEffect(
      "Standard (non-aero) wheel design",
      0.004,
      "wheelDesign",
      "switch to an aero-optimized wheel design"
    );
  } else if (p.wheelDesign === "sport") {
    pushEffect(
      "Open-spoke sport wheels",
      0.007,
      "wheelDesign",
      "switch to an aero-optimized wheel design"
    );
  }

  // A-pillar thickness: thicker pillar => more drag
  pushEffect(
    "Thick A-pillar",
    (p.aPillarThickness - 45) * 0.00006,
    "aPillarThickness",
    "slim down the A-pillar thickness"
  );

  // small deterministic 'noise' so the model doesn't feel purely linear
  const seedStr = JSON.stringify(p);
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
  const noise = ((seed % 1000) / 1000 - 0.5) * 0.006;
  cd += noise;

  cd = Math.max(0.18, Math.min(0.36, cd));

  // sort contributions by magnitude, worst offenders first
  contributions.sort((a, b) => b.delta - a.delta);

  return {
    cd,
    mae: 0.010 + Math.abs(noise) * 0.4,
    r2: 0.58 + Math.random() * 0.08,
    contributions,
    source: "baseline (LightGBM/XGBoost, mock)",
  };
}

/**
 * Mock prediction for the STL/OBJ upload flow. We don't parse the
 * mesh client-side — this simulates the PointNet pipeline's output
 * shape (Cd + a slightly tighter error band) using the file itself
 * as a pseudo-random seed so results are stable per file.
 */
function predictCdFromFile(file) {
  let seed = 0;
  const str = file.name + file.size;
  for (let i = 0; i < str.length; i++) seed = (seed * 31 + str.charCodeAt(i)) >>> 0;
  const rand = (seed % 10000) / 10000;
  const cd = CD_DATASET_RANGE.min + rand * (CD_DATASET_RANGE.max - CD_DATASET_RANGE.min);

  const genericContributions = [
    { label: "Frontal silhouette / greenhouse proportions", delta: 0.01, paramKey: "shape", direction: "reduce greenhouse height and taper the roofline toward the rear" },
    { label: "Rear-end shape (ramp / diffusor balance)", delta: 0.008, paramKey: "shape", direction: "soften the rear ramp angle and add diffusor detailing" },
    { label: "Front bumper geometry", delta: 0.006, paramKey: "shape", direction: "round out the front bumper's leading edge" },
  ];

  return {
    cd,
    mae: 0.008 + rand * 0.004,
    r2: 0.60 + (1 - rand) * 0.06,
    contributions: cd > CD_TARGET_THRESHOLD ? genericContributions : [],
    source: "PointNet (100k point cloud, mock)",
  };
}

/* ---------- Recommendation text generator (stands in for an LLM call) ---------- */
function buildRecommendations(result) {
  if (!result.contributions.length || result.cd <= CD_TARGET_THRESHOLD) return [];
  return result.contributions.slice(0, 4).map((c, i) => ({
    rank: i + 1,
    issue: c.label,
    suggestion: capitalize(c.direction) + ".",
    estImpact: `~${(Math.abs(c.delta) * 100).toFixed(1)}% of current Cd`,
  }));
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatCd(cd) {
  return cd.toFixed(4);
}

function cdBadgeClass(cd) {
  if (cd <= 0.24) return "badge-good";
  if (cd <= CD_TARGET_THRESHOLD) return "badge-ok";
  return "badge-high";
}

document.addEventListener("DOMContentLoaded", initNav);
