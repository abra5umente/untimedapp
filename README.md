untimed.app
=============
<img width="916" height="569" alt="image" src="https://github.com/user-attachments/assets/cbbf275b-631d-4392-8297-9501de023666" />  

 A pomodoro-esque timer with literally no bells, nor whistles.


**What makes untimed different?**  
---------------------------------
Most timer apps I've tried share the same problem - they all do too much.
They all sync with everything, have AI built-in, and demand more and more information from you.  
untimed is different.  
It won't ever ask you to sign in. It will never ask you to sync with Gmail. It won't even stop when it reaches 00:00.

**So what does it actually do, then?**  
- untimed will start running a timer when you click `start work`.
- When the timer hits 00:00, you will hear a single, short beep, but the timer will keep running, counting down into negative time
- When you are *actually* ready to take your break, you hit `take break`.
- untimed will stop the work timer, save the actual length of your session, and then start the break timer
- While you enjoy your break, the timer runs down to 00:00. A short beep will sound.
- Not ready to face reality again yet? Just leave it. It will log the actual time for you.
- When you're ready to come back, click `start work` again

Highlights
----------
- User-configurable work and break session durations
- Collapsible notes panel with markdown notes & live preview
- Statistics tracker (using local storage)
- Export to Markdown including per‑session configured vs actual durations and overall totals
- Themeable accents (cyan, violet, amber, green, red, blue)
- Scanlines overlay controls: on/off toggle and opacity slider (0–1)
- Simple beep notifications at work/break 00:00; toggle in Settings (muted state highlighted)
- Mobile‑ready UI
- Installable PWA with offline support

**Sounds cool, what does it look like?**
---------------
Settings panel:  
<img width="480" height="710" alt="image" src="https://github.com/user-attachments/assets/aaed971b-c406-4e1b-9754-09cde9875b45" />  
Statistics panel:  
<img width="435" height="279" alt="image" src="https://github.com/user-attachments/assets/9c584c30-d29e-417e-8d43-a367091066ad" />  
With notes pane:  
<img width="1416" height="596" alt="image" src="https://github.com/user-attachments/assets/3c3bdb2a-16cb-4685-8d49-af629a15ef2f" />  
In break mode:  
<img width="1454" height="592" alt="image" src="https://github.com/user-attachments/assets/03de47a5-786f-41a7-918a-7a531b6d59d5" />  

**Okay, so how does it actually work?**
--------
[![Watch on Youtube](https://img.youtube.com/vi/ivJMenq9UMk/maxresdefault.jpg)](https://youtu.be/ivJMenq9UMk)

**Alright, now how do I actually use it?**
------------------------------------------
I've deployed this at https://untimed.midgard-realm.xyz - free for anyone to use. All I ask is that you give this repo a star if you found it handy.  
Or, if you want to host it yourself:  

Web App (FastAPI)
-----------------
- Requirements: Python 3.8+, `fastapi`, `uvicorn`
- Install: `pip install fastapi uvicorn`
- Run from repo root: `uvicorn webapp.app:app --host 0.0.0.0 --reload`
- Open: `http://127.0.0.1:8000` locally or `http://<your-ip>:8000` on your LAN

Docker
------
- Clone: `git clone https://github.com/abra5umente/untimedapp`
- Build: `docker build -t untimedapp .`
- Run: `docker run --rm -p 8080:8080 untimedapp`
- Change port (optional): `docker run -e PORT=9000 -p 9000:9000 untimedapp`
- Image uses a non-root user and runs `uvicorn webapp.app:app` on port `8080` by default (configurable via `$PORT`).

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

**Extras**
----------

Mobile & Responsiveness
-----------------------
- Viewport and safe‑area support are enabled; the layout switches to a single column under `768px`.
- Controls use a 2‑column grid on small screens and have 44px minimum hit targets.
- The clock text dynamically resizes to fit its box without clipping.
- Touch: the controls toggle is pointer/touch friendly and avoids accidental bounce animations on mobile.

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
