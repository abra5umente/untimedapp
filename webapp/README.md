timerless.app (FastAPI)
=======================

Lightweight web UI (timerless.app) that reuses the core timer engine in `pymodoro/timer_core.py`.

Requirements
------------
- Python 3.8+
- Packages: `fastapi`, `uvicorn` (install with `pip install fastapi uvicorn`)

Run
---
From the repository root (so `pymodoro` is on `PYTHONPATH`):

```
uvicorn webapp.app:app --host 0.0.0.0 --reload
```

Then open `http://127.0.0.1:8000` locally, or from another device on your network use `http://<your-computer-ip>:8000`.

Alternatively, you can run the module directly (binds to `0.0.0.0` by default):

```
python -m webapp.app
```

Notes
-----
- The API exposes endpoints under `/api/*` and serves static files under `/static`.
- Settings changes stop/reset the timer and apply immediately.
- The frontend polls `/api/state` every second; no WebSockets required.
- The timer continues counting into negative during both work and break. An event is emitted when work hits 00:00 (`work_zero`) and when break hits 00:00 (`break_zero`).

UI Controls
-----------
- `start work`: begins a work session.
- `take break`: starts a short/long break based on threshold.
- `pause` / `resume`: pauses or resumes the current work/break (no reset).
- `reset`: resets to a fresh work session (idle state).
- `clear`: clears counts and resets session state (also starts a new notes session).
- `settings`: edit durations and threshold.
- `notes ▸/▾`: toggles a collapsible notes panel under the timer with a two‑column layout (Markdown editor + live preview).

Notes & Markdown
----------------
- The notes panel supports Markdown with live preview using `marked` (parser) and `DOMPurify` (sanitizer), loaded from jsDelivr.
- Notes auto‑save to `localStorage` per logical session. Save/Clear buttons are provided.
- Notes are stored 100% client‑side in your browser; nothing is uploaded to the server. A "clear local data" button wipes all notes/cycle data from `localStorage`.
- Export to Markdown includes:
  - Per session: configured work/break lengths and actual durations.
  - Overall: number of sessions, total work time, total break time.
  - Notes content.

API Summary
-----------
- `GET /api/state`: current timer state, including `formatted` and `last_event`.
- `GET /api/config` / `POST /api/config`: read/update durations and threshold.
- `POST /api/start_work` / `POST /api/request_break`.
- `POST /api/pause` / `POST /api/resume`.
- `POST /api/reset` / `POST /api/clear`.

Title & Theme
-------------
- Page title is `timerless.app`.
- Stable dark‑blue background; theme accent selectable (cyan, violet, amber, green) and persisted to `localStorage`.
