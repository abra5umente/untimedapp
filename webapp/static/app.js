(() => {
  const $ = (sel) => document.querySelector(sel);

  const els = {
    phase: $("#phase"),
    count: $("#count"),
    clock: $("#clock"),
    msg: $("#message"),
    btnStart: $("#start"),
    btnBreak: $("#break"),
    btnStop: $("#stop"),
    btnReset: $("#reset"),
    btnClear: $("#clear"),
    btnOpenSettings: $("#open-settings"),
    btnOpenNotes: $("#open-notes"),
    modal: $("#settings-modal"),
    notesPanel: $("#notes-panel"),
    // settings
    form: $("#settings-form"),
    session: $("#session"),
    short: $("#short"),
    long: $("#long"),
    threshold: $("#threshold"),
    theme: $("#theme"),
    // notes
    notes: $("#notes"),
    preview: $("#notes-preview"),
    btnSaveNotes: $("#save-notes"),
    btnClearNotes: $("#clear-notes"),
    btnExportNotes: $("#export-notes"),
    btnClearLocalData: $("#clear-local-data"),
  };

  // glyph color follows theme primary
  let glyphColor = "#00e5ff";

  async function api(method, path, body) {
    const opts = { method, headers: { "Content-Type": "application/json" } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(path, opts);
    if (!res.ok) throw new Error(`${method} ${path} failed`);
    return await res.json();
  }

  function setMessage(text) {
    els.msg.textContent = text || "";
  }

  // ----- Session + Notes helpers -----
  function getSessionId() {
    let sid = localStorage.getItem("session_id");
    if (!sid) {
      sid = `s_${Date.now()}`;
      localStorage.setItem("session_id", sid);
    }
    return sid;
  }
  function newSessionId() {
    const sid = `s_${Date.now()}`;
    localStorage.setItem("session_id", sid);
    // also reset tracked cycles for the new session
    clearCycles();
    return sid;
  }
  function notesKey() {
    return `notes:${getSessionId()}`;
  }
  function loadNotes() {
    if (!els.notes) return;
    els.notes.value = localStorage.getItem(notesKey()) || "";
    renderNotesPreview();
  }
  function saveNotes() {
    if (!els.notes) return;
    localStorage.setItem(notesKey(), els.notes.value || "");
    setMessage("notes saved.");
    renderNotesPreview();
  }
  function clearNotes() {
    if (!els.notes) return;
    els.notes.value = "";
    localStorage.removeItem(notesKey());
    renderNotesPreview();
  }

  function clearAllLocalData() {
    try {
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (k.startsWith("notes:") || k.startsWith("cycles:") || k === "session_id") {
          toRemove.push(k);
        }
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
      newSessionId();
      clearNotes();
      setMessage("local notes data cleared.");
    } catch (e) {
      setMessage("failed to clear local data.");
    }
  }

  function renderNotesPreview() {
    if (!els.preview) return;
    const src = (els.notes && els.notes.value) || "";
    try {
      // Configure marked if available
      if (window.marked) {
        window.marked.setOptions({ breaks: true, gfm: true });
        const html = window.marked.parse(src || "");
        const safe = window.DOMPurify ? window.DOMPurify.sanitize(html) : html;
        els.preview.innerHTML = safe;
      } else {
        // Fallback: escape and show preformatted
        els.preview.textContent = src;
      }
    } catch (e) {
      els.preview.textContent = src;
    }
  }

  // Shared state for polling and export
  let lastState = null;
  let lastConfig = null;
  let cycles = loadCycles();
  let currentCycle = null;

  // ----- Session cycles tracking (per session_id) -----
  // [{ work: { start_ts, end_ts, config_seconds }, break?: { start_ts, end_ts, config_seconds, kind? } }]
  function cyclesKey() {
    return `cycles:${getSessionId()}`;
  }
  function loadCycles() {
    try { return JSON.parse(localStorage.getItem(cyclesKey()) || "[]"); } catch { return []; }
  }
  function saveCycles(c) {
    localStorage.setItem(cyclesKey(), JSON.stringify(c));
  }
  function clearCycles() {
    localStorage.removeItem(cyclesKey());
  }

  function applyState(s) {
    const prev = lastState;
    trackPhaseTransitions(prev, s);
    lastState = s;
    els.count.textContent = `sessions: ${s.pomodoros_completed ?? 0}`;
    const formatted = s.formatted || "00:00";
    els.clock.textContent = formatted;
    // keep text-masked scanlines overlay in sync
    els.clock.setAttribute("data-text", formatted);

    if (s.last_event && s.last_event.name) {
      const name = s.last_event.name;
      const data = s.last_event.data || {};
      switch (name) {
        case "work_started":
          setMessage("work started. stay focused!");
          break;
        case "paused":
          setMessage("timer paused.");
          break;
        case "resumed":
          setMessage("timer resumed.");
          break;
        case "work_zero":
          setMessage("work hit 00:00. you can take a break.");
          break;
        case "work_completed":
          setMessage(`work completed. overtime: ${formatOvertime(data.overtime_seconds)}`);
          break;
        case "break_started":
          setMessage(data.kind === "long" ? "long break started." : "short break started.");
          break;
        case "break_ended":
          setMessage("break ended. ready for the next sprint?");
          break;
        case "stopped":
          setMessage("timer stopped.");
          break;
        case "work_reset":
          setMessage("work reset to full duration.");
          break;
        case "session_cleared":
          setMessage("session cleared. counters reset.");
          break;
        default:
          break;
      }
    }

    // Button enable/disable hints
    const phase = s.phase;
    const running = s.running;
    els.btnStart.disabled = running && phase === "work";
    els.btnBreak.disabled = !(running && phase === "work") && !(running && phase === "break");
    // Pause/Resume button availability: enabled during work or break
    const canPauseResume = phase === "work" || phase === "break";
    els.btnStop.disabled = !canPauseResume;
    // Update button label
    if (els.btnStop) {
      els.btnStop.textContent = running ? "pause" : (canPauseResume ? "resume" : "pause");
    }

    // Subtle pulse on work indicator when running
    const shouldPulse = !!(running && phase === "work");
    const shouldPulseFast = !!(!running && phase === "work");
    if (els.phase) {
      els.phase.classList.toggle("pulse", shouldPulse);
      els.phase.classList.toggle("pulse-fast", shouldPulseFast);
      // Update label: show 'paused' when paused in work phase
      const label = shouldPulseFast ? "paused" : (s.phase || "idle");
      els.phase.textContent = label;
    }

    // Main timer pulse: normal when running, double-rate when paused (work)
    const sec = typeof s.seconds_remaining === "number" ? s.seconds_remaining : null;
    const workRunning = running && phase === "work";
    const workPaused = !running && phase === "work" && sec !== null && sec > 0;
    const isBreak = phase === "break";
    if (els.clock) {
      // pulse behavior
      els.clock.classList.toggle("pulse", workRunning && !workPaused);
      els.clock.classList.toggle("pulse-fast", !!workPaused);
      // dim during break (running or paused)
      els.clock.classList.toggle("dim", !!isBreak);
      // ensure classes are cleared when neither applies
      if (!workRunning && !workPaused) {
        els.clock.classList.remove("pulse");
        els.clock.classList.remove("pulse-fast");
      }
      if (!isBreak) {
        els.clock.classList.remove("dim");
      }
    }
  }

  function trackPhaseTransitions(prev, s) {
    // Ensure storage is initialized
    if (typeof cycles === "undefined") cycles = loadCycles();
    if (typeof currentCycle === "undefined") currentCycle = null;

    const prevPhase = prev && prev.phase;
    const phase = s.phase;
    const now = Date.now();

    const pushIfComplete = () => {
      if (currentCycle && currentCycle.work && currentCycle.work.start_ts && currentCycle.work.end_ts) {
        const list = loadCycles();
        list.push(currentCycle);
        saveCycles(list);
        cycles = list;
        currentCycle = null;
      }
    };

    // Start of work (idle->work or break->work)
    if (phase === "work" && s.running && prevPhase !== "work") {
      if (prevPhase === "break" && currentCycle && currentCycle.break && !currentCycle.break.end_ts) {
        currentCycle.break.end_ts = now;
        pushIfComplete();
      }
      currentCycle = {
        work: {
          start_ts: now,
          end_ts: null,
          config_seconds: typeof s.seconds_remaining === "number" ? s.seconds_remaining : null,
        },
      };
      return;
    }

    // Work -> Break
    if (prevPhase === "work" && phase === "break" && s.running) {
      if (!currentCycle) currentCycle = { work: { start_ts: now, end_ts: null, config_seconds: null } };
      if (currentCycle.work && !currentCycle.work.end_ts) currentCycle.work.end_ts = now;
      const kind = (s.last_event && s.last_event.name === "break_started" && s.last_event.data && s.last_event.data.kind) || null;
      currentCycle.break = {
        start_ts: now,
        end_ts: null,
        config_seconds: typeof s.seconds_remaining === "number" ? s.seconds_remaining : null,
        kind,
      };
      return;
    }

    // Work -> Idle
    if (prevPhase === "work" && phase === "idle") {
      if (!currentCycle) currentCycle = { work: { start_ts: now, end_ts: null, config_seconds: null } };
      if (currentCycle.work && !currentCycle.work.end_ts) currentCycle.work.end_ts = now;
      pushIfComplete();
      return;
    }

    // Break -> Idle
    if (prevPhase === "break" && phase === "idle") {
      if (currentCycle && currentCycle.break && !currentCycle.break.end_ts) {
        currentCycle.break.end_ts = now;
      }
      pushIfComplete();
      return;
    }
  }

  function formatOvertime(sec) {
    if (typeof sec !== "number") return "00:00";
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const r = (s % 60).toString().padStart(2, "0");
    return `${m}:${r}`;
  }

  async function refresh() {
    try {
      const s = await api("GET", "/api/state");
      applyState(s);
    } catch (e) {
      setMessage("unable to reach server. check if backend runs.");
    }
  }

  async function loadConfig() {
    try {
      const c = await api("GET", "/api/config");
      lastConfig = c;
      els.session.value = c.pomodoro_minutes;
      els.short.value = c.short_break_minutes;
      els.long.value = c.long_break_minutes;
      els.threshold.value = c.pomodoro_threshold;
    } catch (e) {
      // ignore if unavailable; likely backend not running yet
    }
    // load theme from localStorage
    if (els.theme) {
      const t = getTheme();
      els.theme.value = t;
    }
  }

  // Wire controls
  els.btnStart.addEventListener("click", async () => {
    await api("POST", "/api/start_work");
    refresh();
  });
  els.btnBreak.addEventListener("click", async () => {
    await api("POST", "/api/request_break");
    refresh();
  });
  els.btnStop.addEventListener("click", async () => {
    try {
      const s = lastState || {};
      if (s.running) {
        await api("POST", "/api/pause");
      } else if (s.phase === "work" || s.phase === "break") {
        await api("POST", "/api/resume");
      }
    } finally {
      refresh();
    }
  });
  els.btnReset.addEventListener("click", async () => {
    await api("POST", "/api/reset");
    refresh();
  });
  els.btnClear.addEventListener("click", async () => {
    await api("POST", "/api/clear");
    refresh();
    // start a fresh notes session
    newSessionId();
    clearNotes();
  });

  els.form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = {
      pomodoro_minutes: parseFloat(els.session.value),
      short_break_minutes: parseFloat(els.short.value),
      long_break_minutes: parseFloat(els.long.value),
      pomodoro_threshold: parseInt(els.threshold.value, 10),
    };
    try {
      await api("POST", "/api/config", body);
      setMessage("settings saved. ready to start.");
      // apply and persist theme if changed
      if (els.theme) {
        applyTheme(els.theme.value);
      }
      refresh();
      // close modal on save
      if (els.modal) els.modal.classList.remove("open");
    } catch (e) {
      setMessage("failed to save settings. check values.");
    }
  });

  // open modal
  if (els.btnOpenSettings && els.modal) {
    els.btnOpenSettings.addEventListener("click", async () => {
      try { await loadConfig(); } catch {}
      els.modal.classList.add("open");
    });
    // backdrop click closes
    els.modal.addEventListener("click", (e) => {
      if (e.target === els.modal) {
        els.modal.classList.remove("open");
      }
    });
  }

  // toggle inline notes panel below timer
  if (els.btnOpenNotes && els.notesPanel) {
    // start with collapsed by default
    els.notesPanel.classList.remove("open");
    els.btnOpenNotes.classList.remove("open");
    els.btnOpenNotes.addEventListener("click", async () => {
      const isOpen = els.notesPanel.classList.toggle("open");
      els.btnOpenNotes.classList.toggle("open", isOpen);
      if (isOpen) {
        try { await loadNotes(); } catch {}
      }
    });
  }

  // Kickoff
  // theme helpers
  function getTheme() {
    return localStorage.getItem("theme") || "cyan";
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    // update glyph color reference
    glyphColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--primary")
      .trim() || "#00e5ff";
  }

  // apply saved theme immediately
  applyTheme(getTheme());

  loadConfig();
  refresh();
  setInterval(refresh, 1000);

  // notes wiring
  loadNotes();
  if (els.btnSaveNotes) {
    els.btnSaveNotes.addEventListener("click", saveNotes);
  }
  if (els.btnClearNotes) {
    els.btnClearNotes.addEventListener("click", () => {
      clearNotes();
      setMessage("notes cleared.");
    });
  }
  if (els.btnExportNotes) {
    els.btnExportNotes.addEventListener("click", () => {
      exportNotesMarkdown();
    });
  }
  if (els.btnClearLocalData) {
    els.btnClearLocalData.addEventListener("click", () => {
      clearAllLocalData();
    });
  }
  if (els.notes) {
    // auto-save after a short pause while typing
    let t;
    els.notes.addEventListener("input", () => {
      clearTimeout(t);
      renderNotesPreview();
      t = setTimeout(saveNotes, 600);
    });
  }

  // ----- Export helpers -----
  function exportNotesMarkdown() {
    const notes = (els.notes && els.notes.value) || "";
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const fn = `pymodoro-notes-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.md`;
    const theme = getTheme();
    const state = lastState || {};
    const cfg = lastConfig || {};
    const lines = [];
    lines.push(`# timerless.app Notes — ${ts}`);
    lines.push("");
    lines.push(`- Phase: ${state.phase ?? "unknown"}`);
    lines.push(`- Running: ${state.running ? "yes" : "no"}`);
    lines.push(`- Time remaining: ${state.formatted ?? "00:00"}`);
    lines.push(`- Sessions completed: ${state.pomodoros_completed ?? 0}`);
    if (cfg && typeof cfg.pomodoro_minutes !== "undefined") {
      lines.push(`- Config: work ${cfg.pomodoro_minutes}m, short ${cfg.short_break_minutes}m, long ${cfg.long_break_minutes}m, threshold ${cfg.pomodoro_threshold}`);
    }
    lines.push(`- Theme: ${theme}`);
    lines.push("");
    // Include per-session breakdown and totals
    const list = loadCycles();
    let totalWork = 0;
    let totalBreak = 0;
    if (list.length > 0) {
      lines.push("## Sessions");
      list.forEach((cyc, i) => {
        const wCfg = Math.max(0, Number(cyc?.work?.config_seconds || 0));
        const wAct = Math.max(0, Number((cyc?.work?.end_ts || 0) - (cyc?.work?.start_ts || 0)) / 1000);
        const bCfg = Math.max(0, Number(cyc?.break?.config_seconds || 0));
        const bAct = Math.max(0, cyc?.break && cyc.break.end_ts && cyc.break.start_ts ? Number(cyc.break.end_ts - cyc.break.start_ts) / 1000 : 0);
        totalWork += wAct;
        totalBreak += bAct;
        lines.push(`### Session ${i + 1}`);
        lines.push(`- Work: configured ${formatSeconds(wCfg)}, actual ${formatSeconds(wAct)}`);
        if (bCfg || bAct) {
          lines.push(`- Break: configured ${formatSeconds(bCfg)}, actual ${formatSeconds(bAct)}`);
        } else {
          lines.push(`- Break: (none)`);
        }
        lines.push("");
      });
      lines.push("## Overall");
      lines.push(`- Sessions: ${list.length}`);
      lines.push(`- Total work: ${formatSeconds(totalWork)}`);
      lines.push(`- Total break: ${formatSeconds(totalBreak)}`);
      lines.push("");
    }
    lines.push("## Notes");
    lines.push("");
    lines.push(notes.trim().length ? notes : "(no notes yet)");
    const content = lines.join("\n");

    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fn;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setMessage("markdown exported.");
  }

  function formatSeconds(sec) {
    const s = Math.max(0, Math.floor(Number(sec) || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  }

  // if theme selector exists, sync on change immediately
  if (els.theme) {
    els.theme.addEventListener("change", () => {
      applyTheme(els.theme.value);
    });
  }

  // --- subtle falling glyphs background ---
  function initRain() {
    const canvas = document.getElementById("bg-rain");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const glyphs = "0123456789abcdef".split("");
    const fontSize = 14; // character size
    let columns = Math.floor(w / fontSize);
    const drops = []; // active drops
    const maxDrops = Math.max(8, Math.floor(columns * 0.05)); // sparse

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      columns = Math.floor(w / fontSize);
    }
    window.addEventListener("resize", resize);

    function spawn() {
      if (drops.length >= maxDrops) return;
      // pick a random column
      const col = Math.floor(Math.random() * columns);
      // avoid too many drops in same column
      if (drops.some((d) => d.col === col)) return;
      drops.push({
        col,
        y: Math.random() * -h, // start above screen
        speed: 50 + Math.random() * 120, // px/s
        // use theme primary color for glyphs
        color: glyphColor,
      });
    }

    // theme change handled globally; no-op here

    let last = performance.now();
    function tick(now) {
      const dt = Math.min(0.05, (now - last) / 1000); // seconds
      last = now;

      // fade slightly to create trails
      ctx.fillStyle = "rgba(0, 8, 16, 0.15)";
      ctx.fillRect(0, 0, w, h);

      ctx.font = `${fontSize}px Consolas, ui-monospace, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        // draw a glyph at current position
        const ch = glyphs[(Math.random() * glyphs.length) | 0];
        const x = d.col * fontSize + fontSize / 2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = d.color;
        ctx.fillStyle = d.color;
        ctx.fillText(ch, x, d.y);
        d.y += d.speed * dt;
        if (d.y > h + 40) drops.splice(i, 1);
      }

      // occasional spawn
      if (Math.random() < 0.15) spawn();
      requestAnimationFrame(tick);
    }

    // prime background
    ctx.fillStyle = "rgba(0,0,0,0.9)";
    ctx.fillRect(0, 0, w, h);
    requestAnimationFrame((t) => {
      last = t;
      tick(t);
    });
  }

  initRain();
})();
