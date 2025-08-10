# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**webdoro** is a Pomodoro timer application with two components:
- `pymodoro/`: Core timer engine (pure Python, no GUI dependencies)
- `webapp/`: FastAPI web application with single-page UI

The core timer (`timer_core.py`) is framework-agnostic and can be used independently. The web app provides a complete UI with themes, notes, and Markdown export.

## Development Commands

### Running the Web Application
```bash
# Install dependencies
pip install fastapi uvicorn

# Run from repo root (so pymodoro is importable)
uvicorn webapp.app:app --host 0.0.0.0 --reload

# Alternative: run module directly
python -m webapp.app

# With environment variables
PORT=3000 RELOAD=true python -m webapp.app
```

Access at: http://127.0.0.1:8000 (or http://<your-ip>:8000 for LAN access)

### Testing the Core Timer
```bash
# Run the minimal CLI demo
python pymodoro/timer_core.py
```

No formal test framework is configured. Testing relies on manual verification per AGENTS.md guidelines.

## Architecture

### Core Timer Engine (`pymodoro/timer_core.py`)
- `TimerConfig`: Configuration dataclass for durations and thresholds
- `TimerState`: Current timer state with phase, time remaining, completion count
- `PomodoroTimer`: Main timer class with threading, event system
- Key features:
  - Continues counting into negative time after 00:00
  - Thread-safe with RLock
  - Event-driven with `on_tick` and `on_event` callbacks
  - Supports pause/resume without resetting

### Web Application (`webapp/app.py`)
- FastAPI backend with REST API endpoints under `/api/*`
- Serves static files from `webapp/static/`
- Global timer instance shared across requests
- Thread-safe event caching for client polling
- No WebSockets - clients poll `/api/state` every second

### Frontend (`webapp/static/`)
- Single-page application (vanilla JS, HTML, CSS)
- Markdown support via CDN (marked + DOMPurify from jsDelivr)
- Client-side notes storage in localStorage (never sent to server)
- Themeable UI with accent colors (cyan, violet, amber, green)
- Responsive design with collapsible notes panel

## Key API Endpoints

- `GET /api/state` - Current timer state with formatted time and last event
- `POST /api/config` - Update timer configuration (stops and resets timer)
- `POST /api/start_work` / `POST /api/request_break`
- `POST /api/pause` / `POST /api/resume`
- `POST /api/reset` / `POST /api/clear`

## Important Patterns

### Timer State Management
The timer engine uses a phase-based state machine:
- `idle`: Default state, shows work duration
- `work`: Active work session, can go negative
- `break`: Short/long break based on completion threshold

### Event System
Events are emitted for state transitions:
- `work_started`, `work_completed`, `work_zero`
- `break_started`, `break_zero`
- `paused`, `resumed`, `stopped`

### Thread Safety
All timer operations use `threading.RLock()` for thread safety. The web app caches the last event in a thread-safe manner for client polling.

### Client-Side Data
Notes and session data are stored exclusively in browser localStorage. The server never receives or stores user notes - this is a key privacy feature.

## Code Style (from AGENTS.md)
- PEP 8 compliance with 4-space indentation
- `snake_case` for functions/vars, `PascalCase` for classes
- Type hints preferred for new code
- Keep UI logic separate from core timer logic
- No inline scripts in HTML - logic stays in `app.js`