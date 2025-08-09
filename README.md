timerless.app
=============

A simple, focused Pomodoro timer with a lightweight web app (FastAPI + single‑page UI). The core timer engine lives in a small Python package.

Highlights
----------
- Work/break cycles with long‑break threshold
- Continues past 00:00 for both work and break
- Pause/Resume without resetting time
- Collapsible notes panel under the timer (▸ closed, ▾ open)
- Markdown notes with live preview (marked + DOMPurify)
- Export to Markdown including per‑session configured vs actual durations and overall totals
- Themeable accent (cyan, violet, amber, green) on a stable dark‑blue background

Web App (FastAPI)
-----------------
- Requirements: Python 3.8+, `fastapi`, `uvicorn`
- Install: `pip install fastapi uvicorn`
- Run from repo root: `uvicorn webapp.app:app --host 0.0.0.0 --reload`
- Open: `http://127.0.0.1:8000` locally or `http://<your-ip>:8000` on your LAN

UI Basics
---------
- `start work`, `take break`, `pause`/`resume`, `reset`, `clear`, `settings`
- `notes ▸/▾` toggles a collapsible, two‑column notes panel (editor + live preview)
- Notes auto‑save to `localStorage` per session; Save/Clear/Export buttons available; a "clear local data" button wipes all saved notes/cycles

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

Code Structure
--------------
- `pymodoro/`: Core timer engine (`timer_core.py`)
- `webapp/`: FastAPI backend and static SPA (`/static`)

Privacy
-------
- Notes are stored 100% client‑side in your browser’s `localStorage` and are never sent to the server.
- Use the "clear local data" button in the notes panel to remove all saved notes and per‑session cycle summaries from your device.

License
-------
MIT. See `LICENSE`.
