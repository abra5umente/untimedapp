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

Web App (FastAPI)
-----------------
- Requirements: Python 3.8+, `fastapi`, `uvicorn`
- Install: `pip install fastapi uvicorn`
- Run from repo root: `uvicorn webapp.app:app --host 0.0.0.0 --reload`
- Open: `http://127.0.0.1:8000` locally or `http://<your-ip>:8000` on your LAN

Docker
------
- Build: `docker build -t webdoro .`
- Run: `docker run --rm -p 8000:8000 webdoro`
- Change port (optional): `docker run -e PORT=9000 -p 9000:9000 webdoro`
- Image uses a non-root user and runs `uvicorn webapp.app:app` on port `8000` by default.

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

Code Structure
--------------
- `pymodoro/`: Core timer engine (`timer_core.py`)
- `webapp/`: FastAPI backend and static SPA (`/static`)

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
