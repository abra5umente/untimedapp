"""
Core Pomodoro timer logic independent of any GUI or OS APIs.

Usage example (CLI):
    from pymodoro.timer_core import TimerConfig, PomodoroTimer

    def on_tick(state):
        print(state.phase, state.seconds_remaining)

    def on_event(name, data):
        print("EVENT", name, data)

    t = PomodoroTimer(TimerConfig(pomodoro_minutes=0.05, short_break_minutes=0.02))
    t.on_tick = on_tick
    t.on_event = on_event
    t.start_work()
"""

from __future__ import annotations

from dataclasses import dataclass
import threading
import time
from typing import Callable, Dict, Optional


@dataclass
class TimerConfig:
    pomodoro_minutes: float = 25
    short_break_minutes: float = 5
    long_break_minutes: float = 15
    pomodoro_threshold: int = 4
    tick_seconds: float = 1.0  # wall-time per tick

    @property
    def pomodoro_seconds(self) -> int:
        return int(self.pomodoro_minutes * 60)

    @property
    def short_break_seconds(self) -> int:
        return int(self.short_break_minutes * 60)

    @property
    def long_break_seconds(self) -> int:
        return int(self.long_break_minutes * 60)


@dataclass
class TimerState:
    phase: str = "idle"  # "idle" | "work" | "break"
    seconds_remaining: int = 0
    pomodoros_completed: int = 0
    running: bool = False
    # True after first hit at 00:00 for a given work/break session
    zero_notified: bool = False

    def copy(self) -> "TimerState":
        return TimerState(
            phase=self.phase,
            seconds_remaining=self.seconds_remaining,
            pomodoros_completed=self.pomodoros_completed,
            running=self.running,
            zero_notified=self.zero_notified,
        )


def format_time(seconds: int) -> str:
    sign = "" if seconds >= 0 else "-"
    s = abs(int(seconds))
    return f"{sign}{s // 60:02d}:{s % 60:02d}"


class PomodoroTimer:
    """Threaded Pomodoro timer engine with event hooks.

    - No GUI/toolkit imports. Pure timing + state transitions.
    - Exposes `on_tick(state)` and `on_event(name, data)` callables.
    - Continues counting into negative during work and break.
    - `request_break()` increments completed count and chooses long/short break.
    """

    def __init__(self, config: Optional[TimerConfig] = None):
        self.config = config or TimerConfig()
        self.state = TimerState(phase="idle", seconds_remaining=self.config.pomodoro_seconds)
        self._lock = threading.RLock()
        self._thread: Optional[threading.Thread] = None
        self._stop_evt = threading.Event()

        # Optional callbacks assigned by caller
        self.on_tick: Optional[Callable[[TimerState], None]] = None
        self.on_event: Optional[Callable[[str, Dict], None]] = None

    # ----- Public API -----
    def start_work(self) -> None:
        with self._lock:
            self._stop_thread_if_running()
            self.state.phase = "work"
            self.state.seconds_remaining = self.config.pomodoro_seconds
            self.state.running = True
            self.state.zero_notified = False
            self._start_thread()
            self._emit("work_started", self._snapshot())

    def request_break(self) -> None:
        """Start a break now. If in work phase, counts overtime and increments pomodoros."""
        with self._lock:
            was_work = self.state.phase == "work"
            overtime = max(0, -self.state.seconds_remaining) if was_work else 0
            if was_work:
                self.state.pomodoros_completed += 1
                self._emit("work_completed", {"overtime_seconds": overtime, **self._snapshot()})
            # Choose break length based on updated count
            if self.state.pomodoros_completed != 0 and self.state.pomodoros_completed % self.config.pomodoro_threshold == 0:
                break_seconds = self.config.long_break_seconds
                kind = "long"
            else:
                break_seconds = self.config.short_break_seconds
                kind = "short"
            self._stop_thread_if_running()
            self.state.phase = "break"
            self.state.seconds_remaining = break_seconds
            self.state.running = True
            self.state.zero_notified = False
            self._start_thread()
            self._emit("break_started", {"kind": kind, **self._snapshot()})

    def stop(self) -> None:
        with self._lock:
            self._stop_thread_if_running()
            self.state.running = False
            self._emit("stopped", self._snapshot())

    def pause(self) -> None:
        """Pause the current timer without resetting phase or time."""
        with self._lock:
            self._stop_thread_if_running()
            self.state.running = False
            self._emit("paused", self._snapshot())

    def resume(self) -> None:
        """Resume the timer if paused during work or break."""
        with self._lock:
            if self.state.phase not in ("work", "break"):
                return
            if self.state.running:
                return
            self.state.running = True
            self._start_thread()
            self._emit("resumed", self._snapshot())

    def reset_work(self) -> None:
        with self._lock:
            self._stop_thread_if_running()
            self.state.phase = "idle"
            self.state.seconds_remaining = self.config.pomodoro_seconds
            self.state.running = False
            self.state.zero_notified = False
            self._emit("work_reset", self._snapshot())

    def clear_session(self) -> None:
        with self._lock:
            self._stop_thread_if_running()
            self.state = TimerState(phase="idle", seconds_remaining=self.config.pomodoro_seconds)
            self._emit("session_cleared", self._snapshot())

    # ----- Internal thread/tick -----
    def _start_thread(self) -> None:
        self._stop_evt.clear()
        self._thread = threading.Thread(target=self._run_loop, name="PomodoroTimerThread", daemon=True)
        self._thread.start()

    def _stop_thread_if_running(self) -> None:
        if self._thread and self._thread.is_alive():
            self._stop_evt.set()
            self._thread.join(timeout=1.0)
        self._thread = None
        self._stop_evt.clear()

    def _run_loop(self) -> None:
        last_tick = time.monotonic()
        while not self._stop_evt.is_set():
            time.sleep(min(0.05, self.config.tick_seconds))
            now = time.monotonic()
            elapsed = now - last_tick
            if elapsed < self.config.tick_seconds:
                continue
            last_tick = now
            with self._lock:
                if not self.state.running:
                    break
                # Update time left
                if self.state.phase in ("work", "break"):
                    self.state.seconds_remaining -= int(self.config.tick_seconds)

                    # One-time notify when hitting 00:00 for work/break
                    if self.state.seconds_remaining <= 0 and not self.state.zero_notified:
                        self.state.zero_notified = True
                        if self.state.phase == "work":
                            self._emit("work_zero", self._snapshot())
                        elif self.state.phase == "break":
                            self._emit("break_zero", self._snapshot())

                self._emit_tick()

    # ----- Helpers -----
    def _emit_tick(self) -> None:
        cb = self.on_tick
        if cb:
            try:
                cb(self._snapshot_state())
            except Exception:
                pass

    def _emit(self, name: str, data: Dict) -> None:
        cb = self.on_event
        if cb:
            try:
                cb(name, data)
            except Exception:
                pass

    def _snapshot_state(self) -> TimerState:
        return self.state.copy()

    def _snapshot(self) -> Dict:
        s = self.state
        return {
            "phase": s.phase,
            "seconds_remaining": s.seconds_remaining,
            "pomodoros_completed": s.pomodoros_completed,
            "running": s.running,
        }


if __name__ == "__main__":
    # Minimal CLI demo with accelerated times
    cfg = TimerConfig(pomodoro_minutes=0.05, short_break_minutes=0.03, long_break_minutes=0.04, tick_seconds=1.0)
    timer = PomodoroTimer(cfg)

    def on_tick(state: TimerState):
        print(f"[TICK] {state.phase} {format_time(state.seconds_remaining)} completed={state.pomodoros_completed}")

    def on_event(name: str, data: Dict):
        print(f"[EVENT] {name}: {data}")
        if name == "work_zero":
            threading.Timer(2.0, timer.request_break).start()
        if name == "break_zero":
            print("Break crossed 00:00")

    timer.on_tick = on_tick
    timer.on_event = on_event
    timer.start_work()
    try:
        while True:
            time.sleep(0.2)
    except KeyboardInterrupt:
        timer.stop()

