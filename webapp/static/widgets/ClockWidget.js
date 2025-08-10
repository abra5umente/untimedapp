export class ClockWidget {
  constructor(opts = {}) {
    this.root = opts.root || document.querySelector('#clock');
    this.pill = opts.pill || document.querySelector('#overtime-pill');
    this.container = this.root ? this.root.parentElement : null;
    this._basePx = 200; // baseline measure size
    this._minPx = 80;
    this._maxPx = 360;
    this._raf = null;

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
    this.request_fit();

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

    // Measure at baseline
    const prev = this.root.style.fontSize;
    this.root.style.fontSize = `${this._basePx}px`;
    const rect = this.root.getBoundingClientRect();
    const measured = rect.width || 1;

    // Compute scale to fit and clamp
    const scale = target / measured;
    const next = Math.max(this._minPx, Math.min(this._maxPx, this._basePx * scale));
    this.root.style.fontSize = `${Math.floor(next)}px`;
  }
}
