from __future__ import annotations

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Optional, Dict
import threading
import os

from pymodoro.timer_core import PomodoroTimer, TimerConfig, TimerState, format_time


app = FastAPI(title="timerless.app")


static_dir = os.path.join(os.path.dirname(__file__), "static")
repo_root = os.path.dirname(os.path.dirname(__file__))
static_favicon_path = os.path.join(static_dir, "favicon.ico")
root_favicon_path = os.path.join(repo_root, "favicon.ico")
app.mount("/static", StaticFiles(directory=static_dir), name="static")


class ConfigIn(BaseModel):
    pomodoro_minutes: float = Field(25, gt=0)
    short_break_minutes: float = Field(5, gt=0)
    long_break_minutes: float = Field(15, gt=0)
    pomodoro_threshold: int = Field(4, gt=0)


# Global timer instance and last-event cache
cfg = TimerConfig()
timer = PomodoroTimer(cfg)
_last_event: Dict[str, object] = {"name": None, "data": None}
_lock = threading.RLock()


def _on_tick(state: TimerState):
    # No-op; clients poll /api/state
    pass


def _on_event(name: str, data: Dict):
    with _lock:
        _last_event["name"] = name
        _last_event["data"] = data


timer.on_tick = _on_tick
timer.on_event = _on_event


@app.get("/")
def index():
    return FileResponse(os.path.join(static_dir, "index.html"))


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    # Prefer favicon served from /static when present; fallback to repo root
    path = static_favicon_path if os.path.exists(static_favicon_path) else root_favicon_path
    if os.path.exists(path):
        return FileResponse(path, media_type="image/x-icon")
    # Not found: return 404 via Starlette
    from starlette.responses import Response
    return Response(status_code=404)


@app.get("/healthz", include_in_schema=False)
def healthz():
    """Lightweight health check endpoint for Cloud Run.

    Returns 200 OK with a simple JSON body. No side effects.
    """
    return {"ok": True}


@app.get("/api/state")
def get_state():
    s = timer._snapshot()  # dict copy
    # augment
    s["formatted"] = format_time(s["seconds_remaining"]) if "seconds_remaining" in s else "00:00"
    s["zero_notified"] = getattr(timer.state, "zero_notified", False)
    with _lock:
        s["last_event"] = _last_event
    return s


@app.get("/api/config")
def get_config():
    c = timer.config
    return dict(
        pomodoro_minutes=c.pomodoro_minutes,
        short_break_minutes=c.short_break_minutes,
        long_break_minutes=c.long_break_minutes,
        pomodoro_threshold=c.pomodoro_threshold,
    )


@app.post("/api/config")
def set_config(new: ConfigIn):
    # Stop and reset with new config
    timer.stop()
    timer.config = TimerConfig(
        pomodoro_minutes=new.pomodoro_minutes,
        short_break_minutes=new.short_break_minutes,
        long_break_minutes=new.long_break_minutes,
        pomodoro_threshold=new.pomodoro_threshold,
    )
    timer.reset_work()
    return {"ok": True}


@app.post("/api/start_work")
def api_start_work():
    timer.start_work()
    return {"ok": True}


@app.post("/api/request_break")
def api_request_break():
    timer.request_break()
    return {"ok": True}


@app.post("/api/stop")
def api_stop():
    timer.stop()
    return {"ok": True}


@app.post("/api/reset")
def api_reset():
    timer.reset_work()
    return {"ok": True}


@app.post("/api/clear")
def api_clear():
    timer.clear_session()
    return {"ok": True}


@app.post("/api/pause")
def api_pause():
    timer.pause()
    return {"ok": True}


@app.post("/api/resume")
def api_resume():
    timer.resume()
    return {"ok": True}


"""
FastAPI app for the timerless.app web UI.

Run with Uvicorn CLI (recommended):
    uvicorn webapp.app:app --host 0.0.0.0 --reload

Or execute this module directly:
    python -m webapp.app

The module entry point binds to 0.0.0.0 to allow external connections.
"""

# Uvicorn CLI example: uvicorn webapp.app:app --host 0.0.0.0 --reload

if __name__ == "__main__":
    # Local executable entry to run Uvicorn with external binding.
    # Respects optional PORT and RELOAD env vars.
    import uvicorn

    port_str = os.getenv("PORT", "8000")
    try:
        port = int(port_str)
    except ValueError:
        port = 8000

    reload_flag = os.getenv("RELOAD", "false").lower() == "true"
    uvicorn.run("webapp.app:app", host="0.0.0.0", port=port, reload=reload_flag)
