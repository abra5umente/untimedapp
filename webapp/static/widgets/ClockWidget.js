export class ClockWidget {
  constructor(opts = {}) {
    this.root = opts.root || document.querySelector('#clock');
    this.pill = opts.pill || document.querySelector('#overtime-pill');
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
}

