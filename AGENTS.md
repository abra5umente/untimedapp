# Repository Guidelines

## Project Structure
- `pymodoro/`: Core timer engine (`timer_core.py`).
- `webapp/`: FastAPI backend with static single‑page UI.
  - `app.py`: FastAPI app mounting `/static` and REST endpoints.
  - `static/index.html`, `static/app.css`, `static/app.js`: UI, styles, and client logic.
- `LICENSE`: MIT.

## Build, Test, and Development

### Web App (FastAPI)
- Requirements: Python 3.8+, `fastapi`, `uvicorn`.
  - `pip install fastapi uvicorn`
- Run from repo root (so `pymodoro` is importable):
  - `uvicorn webapp.app:app --host 0.0.0.0 --reload`
- Open: http://127.0.0.1:8000

## Frontend Features (Web)
- Stable dark‑blue background; accent color is theme‑driven.
- Theme selector (Settings): cyan, violet, amber, green. Persists via `localStorage`.
- Work badge pulses while running; shows “paused” and pulses rapidly when paused.
- Main timer pulses while running; pulses rapidly when paused; dims during breaks.
- Break start messages are explicit: “short break started.” / “long break started.”
- Collapsible notes panel under the timer with two‑column layout (Markdown editor + live preview), auto‑save, Save/Clear/Export, and a "clear local data" button.

## Coding Style & Naming
- Follow PEP 8; 4‑space indentation.
- Names: `snake_case` for functions/vars, `PascalCase` for classes, `UPPER_CASE` for constants.
- Prefer type hints in new/modified code and short, focused functions.
- Docstrings: triple double‑quotes; explain side effects and threading.
- Keep UI code (web static) separate from logic/helpers where feasible; avoid adding new globals.
- For the web frontend, avoid inline scripts doing heavy logic outside `app.js`.

## Testing Guidelines
- Web manual checks:
  - Theme persists; background remains dark blue; glyphs follow theme.
  - Work badge/timer pulse states (running vs paused) and dim during breaks.
  - Messages on break start show correct short/long text.
  - Notes auto‑save, Save/Clear work; Markdown export downloads a `.md` file.
- If adding tests, use `pytest` for pure helpers (e.g., `format_time`, settings load/save). Place under `pymodoro/tests/` as `test_*.py`.

## Commit & Pull Requests
- Commit messages: imperative summary (≤72 chars). Prefer Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.
- PRs should include: clear description, linked issues, screenshots/GIFs for UI changes, manual test steps, and any packaging notes (PyInstaller data files).
- Note Windows version tested and any platform‑specific behavior. For web features, include browser/version if relevant.

## Security & Configuration
- Notes are client‑only: never add backend endpoints that store or fetch notes.
- Web app stores UI prefs and notes in `localStorage`; avoid putting secrets there.
