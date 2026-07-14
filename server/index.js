const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));

app.get("/api/users", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, email, name FROM users ORDER BY id LIMIT 50"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed to fetch users" });
  }
});

app.get("/api/predictions", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, source, car_type, predicted_cd, mae, r2, created_at
       FROM predictions
       ORDER BY created_at DESC
       LIMIT 50`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed to fetch predictions" });
  }
});

app.post("/api/predictions", async (req, res) => {
  const { source, carType, predictedCd, mae, r2 } = req.body || {};
  if (!source || predictedCd == null) {
    return res.status(400).json({ error: "source and predictedCd are required" });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO predictions (source, car_type, predicted_cd, mae, r2)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, source, car_type, predicted_cd, mae, r2, created_at`,
      [source, carType ?? null, predictedCd, mae ?? null, r2 ?? null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed to save prediction" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`qi-test-api listening on ${port}`));
