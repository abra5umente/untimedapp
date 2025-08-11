untimed.app
=============

A simple, focused Pomodoro timer with a lightweight web app (FastAPI + single‑page UI). The core timer engine lives in a small Python package.

Highlights
----------
- Work/break cycles with long‑break threshold
- Continues past 00:00 for both work and break
- Pause/Resume without resetting time
- Collapsible notes panel next to the timer (side pane)
- Markdown notes with live preview (marked + DOMPurify)
- Export to Markdown including per‑session configured vs actual durations and overall totals
- Themeable accent (cyan, violet, amber, green, red, blue) on a stable dark‑blue background
- Subtle falling glyphs background that follows the current theme
- Progress‑linked accent glyphs: more letters from “time is running out!” fall as 00:00 approaches (work)
- Confetti celebration at work 00:00 using theme colors and simple physics
- Scanlines overlay controls: on/off toggle and opacity slider (0–1)
- Themed scrollbars across app surfaces
- Instant theme application (no refresh) including retinted background glyphs
- Smooth animations: Settings/Statistics dropdowns match the Notes rollout
- Overtime badge without layout shift and stable clock sizing at 00:00
- Simple beep notifications at work/break 00:00; toggle in Settings (muted state highlighted)
 - Mobile‑ready UI: fluid layout under 768px, large touch targets, and a clock that dynamically fits its container.
 - Installable PWA with offline support via a service worker.

Web App (FastAPI)
-----------------
- Requirements: Python 3.8+, `fastapi`, `uvicorn`
- Install: `pip install fastapi uvicorn`
- Run from repo root: `uvicorn webapp.app:app --host 0.0.0.0 --reload`
- Open: `http://127.0.0.1:8000` locally or `http://<your-ip>:8000` on your LAN

Docker
------
- Build: `docker build -t webdoro .`
- Run: `docker run --rm -p 8080:8080 webdoro`
- Change port (optional): `docker run -e PORT=9000 -p 9000:9000 webdoro`
- Image uses a non-root user and runs `uvicorn webapp.app:app` on port `8080` by default (configurable via `$PORT`).

Mobile & Responsiveness
-----------------------
- Viewport and safe‑area support are enabled; the layout switches to a single column under `768px`.
- Controls use a 2‑column grid on small screens and have 44px minimum hit targets.
- The clock text dynamically resizes to fit its box without clipping.
- Touch: the controls toggle is pointer/touch friendly and avoids accidental bounce animations on mobile.

Google Cloud Run
----------------
Deploy using Cloud Build + Cloud Run (requires `gcloud`):

1. Set your project and region:
   - `gcloud config set project <PROJECT_ID>`
   - `gcloud config set run/region <REGION>` (e.g., `us-central1`)
2. Build the image:
   - `gcloud builds submit --tag gcr.io/<PROJECT_ID>/webdoro:latest`
3. Deploy to Cloud Run (fully managed):
   - `gcloud run deploy webdoro --image gcr.io/<PROJECT_ID>/webdoro:latest --platform managed --allow-unauthenticated`

Notes
- The container listens on `$PORT` (Cloud Run sets `8080`), binds `0.0.0.0`, and respects proxy headers.
- Health endpoint: `/healthz` returns `{ "ok": true }`.

Fly.io
------
Deploy using Fly Machines (requires `flyctl`):

1. Install: https://fly.io/docs/hands-on/install-flyctl/
2. Initialize (uses included Dockerfile and `fly.toml`):
   - `fly launch --no-deploy` (choose a region and app name or keep `untimedapp`)
3. Deploy:
   - `fly deploy`
4. Open:
   - `fly open`

Notes
- Listens on `0.0.0.0:${PORT}` with default `PORT=8080` on Fly.
- Health endpoint: `/healthz` is configured in `fly.toml` for checks.

UI Basics
---------
- `start work`, `take break`, `pause`/`resume`, `reset`, `clear`
- Drawer toggles: `settings ▸/▾` and `statistics ▸/▾` open inside the left controls drawer
- Notes toggle: `notes +/−` opens a two‑column notes panel (editor + live preview) next to the timer
- Spacing between Settings, Notes, and Statistics toggles is consistent
- Drawer closes when clicking outside of it
- Settings include: durations, threshold, theme, scanlines (enable + opacity), and a sound enable/disable toggle (row highlights red when muted)
- Notes auto‑save to `localStorage` per session; Save/Clear/Export buttons available; a "clear local data" button wipes all saved notes/cycles
 - Settings: durations, threshold, theme, scanlines (enable + opacity)

Visual FX & Background
----------------------
- Falling glyphs background (Matrix‑style) uses the theme accent color.
- During work, accent letters from “time is running out!” increase as 00:00 nears.
- When work reaches 00:00, the timer explodes into theme‑colored confetti.
- Scanlines overlay can be disabled and its opacity adjusted in Settings.
- Theme changes update visuals immediately (including glyphs), no refresh required.

Export Contents
---------------
- Per session: configured work length, actual work duration, configured break length, actual break duration
- Overall: number of sessions, total time working, total time in break
- Notes (as written)

CDN Note (Markdown Rendering)
-----------------------------
The web UI uses:
- marked (Markdown parser)
- DOMPurify (HTML sanitizer)

These load from jsDelivr CDN by default in `webapp/static/index.html`.

- Offline/self‑hosted option: download the scripts to `webapp/static/vendor/` and update the `<script>` tags to point at `/static/vendor/...`.
- SRI hashes: if you add `integrity` attributes, ensure the hashes match the exact files you serve; otherwise the browser will block them.
 - Offline behavior: the service worker caches the app shell and will cache CDN scripts on first use (stale‑while‑revalidate). For guaranteed offline Markdown preview on first run, self‑host these scripts.

Progressive Web App (PWA)
-------------------------
- Installable on supported browsers; offline capable for the core app shell.
- Manifest: `webapp/static/manifest.webmanifest` (served at `/manifest.webmanifest`).
- Service worker: `webapp/static/service-worker.js` (served at `/service-worker.js`) with cache versioning via `CACHE_VERSION`.
- Icons (PNG): under `webapp/static/icons/`.
  - `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`
  - `android-chrome-192x192.png`, `android-chrome-512x512.png`
  - Maskable: `untimed_maskable.png` (1280×1280) declared with `purpose: "maskable any"`.
- Favicon: `/favicon.ico` route serves the 32×32 (or 16×16) PNG for legacy requests.

Usage
- Development: PWA works on `http(s)` and on `http://localhost`. Start the app and open it in Chrome/Edge/Firefox.
- Install: Use the browser’s “Install app” prompt or menu.
- Update SW cache: bump `CACHE_VERSION` in `service-worker.js` when you change static assets, then reload. In Chrome DevTools → Application → Service Workers you can trigger “Update/Skip Waiting”.
- Unregister SW (dev): Chrome DevTools → Application → Service Workers → Unregister; or clear site data.

Code Structure
--------------
- `pymodoro/`: Core timer engine (`timer_core.py`)
- `webapp/`: FastAPI backend and static SPA (`/static`)
  - PWA: `manifest.webmanifest`, `service-worker.js`, icons under `static/icons/`

Privacy
-------
- Notes are stored 100% client‑side in your browser’s `localStorage` and are never sent to the server.
- Use the "clear local data" button in the notes panel to remove all saved notes and per‑session cycle summaries from your device.

Sounds
------
- Short beeps play at work 00:00 and break 00:00 by default.
- Toggle in Settings under “sound”; when off, the setting highlights with a red accent.

License
-------
MIT. See `LICENSE`.
