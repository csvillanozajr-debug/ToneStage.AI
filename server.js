import express from "express";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from public/
app.use(express.static(join(__dirname, "public")));
app.use(express.json());

// Presets API
const PRESETS_PATH = join(__dirname, "data", "presets.json");

function readPresets() {
  try {
    const data = readFileSync(PRESETS_PATH, "utf8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writePresets(presets) {
  writeFileSync(PRESETS_PATH, JSON.stringify(presets, null, 2), "utf8");
}

// GET /api/presets
app.get("/api/presets", (req, res) => {
  const presets = readPresets();
  res.json(presets);
});

// POST /api/presets
app.post("/api/presets", (req, res) => {
  const { name, state } = req.body;
  if (!name || !state) {
    return res.status(400).json({ error: "Invalid preset" });
  }
  const presets = readPresets();
  const id = `preset-${Date.now()}`;
  presets.push({ id, name, state });
  writePresets(presets);
  res.json({ id, name, state });
});

// GET /api/presets/:id
app.get("/api/presets/:id", (req, res) => {
  const presets = readPresets();
  const preset = presets.find((p) => p.id === req.params.id);
  if (!preset) return res.status(404).json({ error: "Not found" });
  res.json(preset);
});

// Fallback for pedal demo files in root (optional but convenient)
app.get("/pedal", (req, res) => {
  res.sendFile(join(__dirname, "pedal.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
