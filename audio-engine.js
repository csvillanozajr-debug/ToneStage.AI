// Web Audio engine for guitar effects

export function createAudioEngine() {
  let context;
  let inputGainNode;
  let outputGainNode;
  let sourceOsc;
  let noiseNode;
  let noiseGain;

  const pedals = new Map();

  async function init() {
    context = new (window.AudioContext || window.webkitAudioContext)();

    inputGainNode = context.createGain();
    outputGainNode = context.createGain();

    inputGainNode.gain.value = 1;
    outputGainNode.gain.value = 0.4;

    // Simulated guitar: sawtooth + noise
    sourceOsc = context.createOscillator();
    sourceOsc.type = "sawtooth";
    sourceOsc.frequency.value = 110;

    const noiseBuffer = createNoiseBuffer(context, 2);
    noiseNode = context.createBufferSource();
    noiseNode.buffer = noiseBuffer;
    noiseNode.loop = true;

    noiseGain = context.createGain();
    noiseGain.gain.value = 0.05;

    sourceOsc.connect(inputGainNode);
    noiseNode.connect(noiseGain).connect(inputGainNode);

    inputGainNode.connect(outputGainNode);
    outputGainNode.connect(context.destination);

    sourceOsc.start();
    noiseNode.start();
  }

  function createNoiseBuffer(ctx, seconds) {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * seconds;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  function getPedalTypeById(id) {
    if (id.includes("pedal-0")) return "overdrive";
    if (id.includes("pedal-1")) return "distortion";
    if (id.includes("pedal-2")) return "delay";
    return "overdrive";
  }

  function ensurePedalNodes(id, type) {
    if (pedals.has(id)) return pedals.get(id);

    const nodes = {
      type,
      active: false,
      params: {},
      input: context.createGain(),
      output: context.createGain(),
      dry: context.createGain(),
      wet: context.createGain(),
      processors: [],
    };

    // Wire into main chain: input -> pedal input, pedal output -> outputGain
    inputGainNode.connect(nodes.input);
    nodes.output.connect(outputGainNode);

    nodes.input.connect(nodes.dry);
    nodes.input.connect(nodes.wet);
    nodes.dry.connect(nodes.output);

    if (type === "overdrive" || type === "distortion") {
      const drive = context.createWaveShaper();
      drive.curve = makeDistortionCurve(0);
      drive.oversample = "4x";

      const tone = context.createBiquadFilter();
      tone.type = "lowshelf";
      tone.frequency.value = 1000;
      tone.gain.value = 0;

      const level = context.createGain();
      level.gain.value = 0.5;

      nodes.processors = [drive, tone, level];
      nodes.wet.connect(drive);
      drive.connect(tone);
      tone.connect(level);
      level.connect(nodes.output);

      const driveParamName = type === "overdrive" ? "Gain" : "Drive";
      const levelParamName = type === "overdrive" ? "Level" : "Volume";

      nodes.params = {
        [driveParamName]: drive,
        Tone: tone,
        [levelParamName]: level,
      };
    } else if (type === "delay") {
      const delay = context.createDelay(1.0);
      delay.delayTime.value = 0.3;

      const feedback = context.createGain();
      feedback.gain.value = 0.4;

      const mix = context.createGain();
      mix.gain.value = 0.5;

      nodes.wet.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(mix);
      mix.connect(nodes.output);

      nodes.processors = [delay, feedback, mix];
      nodes.params = {
        Time: delay,
        Feedback: feedback,
        Mix: mix,
      };
    }

    pedals.set(id, nodes);
    return nodes;
  }

  function makeDistortionCurve(amount) {
    const k = typeof amount === "number" && amount > 0 ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  function setPedalActive(id, active) {
    const type = getPedalTypeById(id);
    const p = ensurePedalNodes(id, type);
    p.active = active;

    if (type === "overdrive" || type === "distortion") {
      const levelName = type === "overdrive" ? "Level" : "Volume";
      const level = p.params[levelName];
      if (active) {
        // restore from param logic later; for now set a default
        level.gain.value = 0.5;
      } else {
        level.gain.value = 0;
      }
    } else if (type === "delay") {
      const mix = p.params.Mix;
      if (!active) {
        mix.gain.value = 0;
      } else {
        // will be controlled by Mix knob
        mix.gain.value = 0.5;
      }
    }
  }

  function setPedalParam(id, paramName, value01) {
    const type = getPedalTypeById(id);
    const p = ensurePedalNodes(id, type);

    if (type === "overdrive" || type === "distortion") {
      if (paramName === "Gain" || paramName === "Drive") {
        const drive = p.params[paramName];
        const amount = value01 * 100;
        drive.curve = makeDistortionCurve(amount);
      } else if (paramName === "Tone") {
        const tone = p.params.Tone;
        tone.gain.value = (value01 * 2 - 1) * 10;
      } else if (paramName === "Level" || paramName === "Volume") {
        const level = p.params[paramName];
        const val = 0.1 + value01 * 0.9;
        level.gain.value = p.active ? val : 0;
      }
    } else if (type === "delay") {
      if (paramName === "Time") {
        const delay = p.params.Time;
        delay.delayTime.value = 0.05 + value01 * 0.7;
      } else if (paramName === "Feedback") {
        const fb = p.params.Feedback;
        fb.gain.value = value01 * 0.8;
      } else if (paramName === "Mix") {
        const mix = p.params.Mix;
        mix.gain.value = p.active ? value01 : 0;
      }
    }
  }

  function setInputGain(value) {
    if (!inputGainNode) return;
    inputGainNode.gain.value = value;
  }

  function setOutputGain(value) {
    if (!outputGainNode) return;
    outputGainNode.gain.value = value;
  }

  return {
    get context() {
      return context;
    },
    init,
    setPedalActive,
    setPedalParam,
    setInputGain,
    setOutputGain,
  };
}
