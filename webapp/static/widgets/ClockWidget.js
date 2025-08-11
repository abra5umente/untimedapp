export class ClockWidget {
  constructor(opts = {}) {
    this.root = opts.root || document.querySelector('#clock');
    this.pill = opts.pill || document.querySelector('#overtime-pill');
    this.container = this.root ? this.root.parentElement : null;
    this._basePx = 200; // baseline measure size
    this._minPx = 80;
    this._maxPx = 360;
    this._raf = null;
    this._measure = null;

    // Bind once
    this.fit_to_container = this.fit_to_container.bind(this);
    this.request_fit = this.request_fit.bind(this);

    // Observe container size changes for responsive font sizing
    if (this.container && 'ResizeObserver' in window) {
      try {
        this._ro = new ResizeObserver(() => this.request_fit());
        this._ro.observe(this.container);
      } catch { /* noop */ }
    } else {
      // Fallback: on window resize
      window.addEventListener('resize', this.request_fit);
    }
    // Create hidden measure node to avoid content-driven reflow
    if (this.container && this.root) {
      this._measure = document.createElement('div');
      this._measure.setAttribute('aria-hidden', 'true');
      this._measure.className = this.root.className || '';
      this._measure.style.position = 'absolute';
      this._measure.style.visibility = 'hidden';
      this._measure.style.pointerEvents = 'none';
      this._measure.style.whiteSpace = 'nowrap';
      this._measure.style.left = '-9999px';
      this._measure.style.top = '-9999px';
      this._measure.textContent = '88:88'; // widest digits baseline
      this.container.appendChild(this._measure);
    }

    // Initial fit
    this.request_fit();
  }

  set_text(text) {
    if (!this.root) return;
    const t = text || '';
    this.root.textContent = t;
    this.root.setAttribute('data-text', t);
  }

  update(state) {
    if (!this.root || !state) return;
    const s = state || {};
    const formatted = s.formatted || '00:00';
    this.set_text(formatted);
    // Re-fit on content change

    const phase = s.phase;
    const running = !!s.running;
    const sec = typeof s.seconds_remaining === 'number' ? s.seconds_remaining : null;

    const workRunning = running && phase === 'work';
    const workPaused = !running && phase === 'work';
    const isBreak = phase === 'break';

    // pulse behavior
    this.root.classList.toggle('pulse', workRunning && !workPaused);
    this.root.classList.toggle('pulse-fast', !!workPaused);

    // dim during break (running or paused)
    this.root.classList.toggle('dim', !!isBreak);
    if (!isBreak) {
      this.root.classList.remove('dim');
    }

    if (!workRunning && !workPaused) {
      this.root.classList.remove('pulse');
      this.root.classList.remove('pulse-fast');
    }

    // overtime indicator when time goes below zero (work or break)
    const isOvertime = (phase === 'work' || phase === 'break') && typeof sec === 'number' && sec < 0;
    this.root.classList.toggle('overtime', !!isOvertime);
    if (this.pill) this.pill.classList.toggle('show', !!isOvertime);

    // Ensure measurement accounts for worst-case width based on format
    if (this._measure) {
      const hasHours = (formatted.match(/:/g) || []).length >= 2;
      const base = hasHours ? '88:88:88' : '88:88';
      // Use ASCII hyphen-minus to match actual formatted string when negative
      this._measure.textContent = isOvertime ? `-${base}` : base;
    }

    // Re-fit after updating measurement baseline
    this.request_fit();
  }

  request_fit() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(this.fit_to_container);
  }

  fit_to_container() {
    this._raf = null;
    if (!this.root) return;
    const container = this.container || this.root.parentElement;
    if (!container) return;
    const cw = container.clientWidth;
    if (!cw || cw <= 0) return;
    // Subtract container horizontal padding
    let pad = 0;
    try {
      const cs = getComputedStyle(container);
      pad = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    } catch {}
    const target = Math.max(0, cw - pad - 12); // small margin

    // Measure using hidden baseline node to avoid UI flicker
    let measured = 0;
    if (this._measure) {
      this._measure.style.fontSize = `${this._basePx}px`;
      const r = this._measure.getBoundingClientRect();
      measured = r.width || 1;
    } else {
      // fallback: measure on root (may cause slight flicker on first fit)
      const prev = this.root.style.fontSize;
      this.root.style.fontSize = `${this._basePx}px`;
      const rect = this.root.getBoundingClientRect();
      measured = rect.width || 1;
      this.root.style.fontSize = prev;
    }

    // Compute scale to fit and clamp
    const scale = target / measured;
    const next = Math.max(this._minPx, Math.min(this._maxPx, this._basePx * scale));
    this.root.style.fontSize = `${Math.floor(next)}px`;
  }
}
