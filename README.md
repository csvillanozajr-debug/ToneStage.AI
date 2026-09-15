# Guitar Effects

A guitar effects pedalboard simulator built with Web Audio API, Express, and PWA support. Includes preset management and Render deployment configuration.

## Features

- Visual pedalboard with overdrive, distortion, and delay
- Real-time audio processing via Web Audio API
- Draggable knobs and footswitches with LEDs
- Save/load presets (stored in `data/presets.json`)
- Installable as a PWA (offline-capable UI)
- Ready to deploy on Render
- Standalone pedal demo (`pedal.html`)

## Setup

```bash
npm install
npm start
```

Then open http://localhost:3000.

Click **Enable Audio** to initialize the Web Audio engine.

## Project Structure

- `public/` – Main app (HTML, CSS, JS, manifest, service worker, icons)
- `public/audio-engine.js` – Web Audio effect implementations
- `data/presets.json` – Preset definitions
- `pedal.html`, `pedal.css`, `pedal-app.js` – Standalone pedal demo
- `server.js` – Express server + preset API
- `render.yaml` – Render deployment config

## PWA

- `manifest.json` defines app metadata and icons.
- `sw.js` caches core assets for offline use.

## Deployment (Render)

1. Push this repo to GitHub/GitLab.
2. In Render, create a new **Web Service** from the repo.
3. Use the provided `render.yaml` or configure:
   - Environment: `Node`
   - Build command: `npm install`
   - Start command: `npm start`
4. Deploy.

## License

MIT
