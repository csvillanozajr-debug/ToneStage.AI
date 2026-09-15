// Guitar Effects – Frontend with Web Audio

import { createAudioEngine } from "./audio-engine.js";

const pedalboard = document.getElementById("pedalboard");
const initAudioBtn = document.getElementById("initAudioBtn");
const savePresetBtn = document.getElementById("savePresetBtn");
const loadPresetBtn = document.getElementById("loadPresetBtn");
const presetSelect = document.getElementById("presetSelect");
const inputGainEl = document.getElementById("inputGain");
const outputGainEl = document.getElementById("outputGain");

let audio = null;

// Pedal definitions
const pedalTypes = [
  { type: "overdrive", label: "Overdrive", knobs: ["Gain", "Tone", "Level"] },
  { type: "distortion", label: "Distortion", knobs: ["Drive", "Tone", "Volume"] },
  { type: "delay", label: "Delay", knobs: ["Time", "Feedback", "Mix"] },
];

// Create pedal DOM
function createPedal(pedal) {
  const el = document.createElement("div");
  el.className = `pedal ${pedal.type}`;
  el.dataset.type = pedal.type;
  el.dataset.id = pedal.id;

  const knobsHtml = pedal.knobs
    .map(
      (k, i) => `
    <div class="pedal-knob knob-${i + 1}" data-param="${k}" data-value="0.5"></div>
  `
    )
    .join("");

  el.innerHTML = `
    <div class="pedal-body">
      <div class="pedal-label">${pedal.label}</div>
      ${knobsHtml}
      <div class="pedal-led"></div>
      <div class="pedal-footswitch"></div>
    </div>
  `;

  const footswitch = el.querySelector(".pedal-footswitch");
  footswitch.addEventListener("click", () => {
    el.classList.toggle("on");
    if (audio) {
      audio.setPedalActive(pedal.id, el.classList.contains("on"));
    }
  });

  el.querySelectorAll(".pedal-knob").forEach((knob) => {
    let dragging = false;
    let startY = 0;
    let startValue = 0.5;

    knob.addEventListener("mousedown", (e) => {
      dragging = true;
      startY = e.clientY;
      startValue = parseFloat(knob.dataset.value || 0.5);
      document.body.style.cursor = "ns-resize";
    });

    window.addEventListener("mouseup", () => {
      dragging = false;
      document.body.style.cursor = "";
    });

    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      const dy = startY - e.clientY;
      let newValue = startValue + dy * 0.01;
      newValue = Math.max(0, Math.min(1, newValue));
      knob.dataset.value = newValue.toFixed(2);
      const angle = -135 + newValue * 270;
      knob.style.transform = `rotate(${angle}deg)`;

      if (audio) {
        audio.setPedalParam(pedal.id, knob.dataset.param, newValue);
      }
    });
  });

  return el;
}

function initBoard() {
  pedalboard.innerHTML = "";
  pedalTypes.forEach((p, idx) => {
    const pedal = {
      id: `pedal-${idx}`,
      type: p.type,
      label: p.label,
      knobs: p.knobs,
    };
    pedalboard.appendChild(createPedal(pedal));
  });
}

// Audio init
initAudioBtn.addEventListener("click", async () => {
  if (!audio) {
    audio = createAudioEngine();
    await audio.init();
    document.querySelectorAll(".pedal").forEach((p) => {
      audio.setPedalActive(p.dataset.id, p.classList.contains("on"));
      p.querySelectorAll(".pedal-knob").forEach((k) => {
        audio.setPedalParam(p.dataset.id, k.dataset.param, parseFloat(k.dataset.value));
      });
    });
    audio.setInputGain(parseFloat(inputGainEl.value));
    audio.setOutputGain(parseFloat(outputGainEl.value));
  }
  try {
    await audio.context.resume();
  } catch {}
});

inputGainEl.addEventListener("input", () => {
  if (audio) audio.setInputGain(parseFloat(inputGainEl.value));
});

outputGainEl.addEventListener("input", () => {
  if (audio) audio.setOutputGain(parseFloat(outputGainEl.value));
});

// Preset handling
async function fetchPresets() {
  const res = await fetch("/api/presets");
  if (!res.ok) return [];
  return res.json();
}

async function savePreset() {
  const name = prompt("Preset name:");
  if (!name) return;

  const pedals = Array.from(document.querySelectorAll(".pedal")).map((p) => {
    const knobs = Array.from(p.querySelectorAll(".pedal-knob")).map((k) => ({
      param: k.dataset.param,
      value: parseFloat(k.dataset.value),
    }));
    return {
      id: p.dataset.id,
      type: p.dataset.type,
      on: p.classList.contains("on"),
      knobs,
    };
  });

  const state = {
    pedals,
    inputGain: parseFloat(inputGainEl.value),
    outputGain: parseFloat(outputGainEl.value),
  };

  await fetch("/api/presets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, state }),
  });

  await loadPresetOptions();
}

async function loadPresetOptions() {
  const presets = await fetchPresets();
  presetSelect.innerHTML = '<option value="">Select preset…</option>';
  presets.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    presetSelect.appendChild(opt);
  });
}

async function loadPreset() {
  const id = presetSelect.value;
  if (!id) return;
  const res = await fetch(`/api/presets/${id}`);
  if (!res.ok) return;
  const preset = await res.json();
  const { state } = preset;

  const pedals = document.querySelectorAll(".pedal");
  pedals.forEach((p) => {
    const data = state.pedals.find((s) => s.id === p.dataset.id);
    if (!data) return;
    p.classList.toggle("on", !!data.on);
    const knobs = p.querySelectorAll(".pedal-knob");
    data.knobs.forEach((k, i) => {
      const knob = knobs[i];
      if (!knob) return;
      knob.dataset.value = k.value.toFixed(2);
      const angle = -135 + k.value * 270;
      knob.style.transform = `rotate(${angle}deg)`;
    });
    if (audio) audio.setPedalActive(p.dataset.id, !!data.on);
  });

  if (audio) {
    audio.setInputGain(state.inputGain ?? 1);
    audio.setOutputGain(state.outputGain ?? 1);
    inputGainEl.value = state.inputGain ?? 1;
    outputGainEl.value = state.outputGain ?? 1;
  }
}

savePresetBtn.addEventListener("click", savePreset);
loadPresetBtn.addEventListener("click", loadPreset);

initBoard();
loadPresetOptions();
