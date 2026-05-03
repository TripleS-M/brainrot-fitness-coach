/* ── Audio & Speech Manager ── */
const AudioManager = {
  ctx: null,

  getCtx() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    return this.ctx;
  },

  /* ── Speech Synthesis ── */
  speak(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.1;
    u.pitch = 1.2;
    u.volume = 1;
    window.speechSynthesis.speak(u);
  },

  /* ── Tone Generator ── */
  playTone(freq, duration, type = 'square') {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  },

  playRepSound() {
    this.playTone(880, 0.12, 'square');
    setTimeout(() => this.playTone(1100, 0.1, 'square'), 80);
  },

  playFailureSound() {
    this.playTone(300, 0.3, 'sawtooth');
    setTimeout(() => this.playTone(200, 0.4, 'sawtooth'), 200);
    setTimeout(() => this.playTone(120, 0.6, 'sawtooth'), 450);
  },

  playSuccessSound() {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.25, 'square'), i * 150);
    });
  },

  /* ── Phrase Banks ── */
  repPhrases: [
    "LOCK IN", "that was clean", "form kinda sus", "GYATT", "no cap that was fire",
    "W rep", "sigma grindset activated", "you're literally him", "main character energy",
    "okay okay I see you", "bro is COOKING", "absolutely goated", "certified banger",
    "erm what the sigma", "keep going bestie", "slay", "that form tho",
    "doing the lord's work", "built different fr", "ohio energy but make it gains"
  ],
  failPhrases: [
    "bro quit already??", "skill issue fur real", "you fell off", "L plus ratio",
    "not the giving up arc", "bro folded", "where's the effort", "nah this is tragic"
  ],
  successPhrases: [
    "MAIN CHARACTER ARC COMPLETE", "you're literally the protagonist",
    "W human specimen", "certified sigma", "that was actually goated",
    "absolutely unhinged performance", "built different", "THE RIZZ IS REAL"
  ],
  randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  getRepPhrase() { return this.randomFrom(this.repPhrases); },
  getFailPhrase() { return this.randomFrom(this.failPhrases); },
  getSuccessPhrase() { return this.randomFrom(this.successPhrases); }
};
