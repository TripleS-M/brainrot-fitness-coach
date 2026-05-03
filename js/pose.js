/* ── Pose Detection & Rep Counting ── */
const PoseManager = {
  pose: null,
  camera: null,
  videoEl: null,
  canvasEl: null,
  ctx: null,
  exerciseType: 'pushup',
  stage: 'idle',
  onRepCallback: null,
  onStatusCallback: null,
  isRunning: false,

  /* ── Initialize MediaPipe Pose ── */
  async init(videoEl, canvasEl, onRep, onStatus) {
    this.videoEl = videoEl;
    this.canvasEl = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.onRepCallback = onRep;
    this.onStatusCallback = onStatus;
    this.stage = 'idle';

    this.pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });

    this.pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.pose.onResults((results) => this.onResults(results));
    await this.pose.initialize();
  },

  /* ── Start Camera ── */
  async start() {
    this.isRunning = true;
    this.stage = 'idle';
    this.camera = new Camera(this.videoEl, {
      onFrame: async () => {
        if (!this.isRunning) return;
        await this.pose.send({ image: this.videoEl });
      },
      width: 640,
      height: 480
    });
    await this.camera.start();
  },

  /* ── Stop Camera ── */
  stop() {
    this.isRunning = false;
    if (this.camera) {
      this.camera.stop();
      this.camera = null;
    }
    this.stage = 'idle';
  },

  setExercise(type) {
    this.exerciseType = type;
    this.stage = 'idle';
  },

  /* ── Process Pose Results ── */
  onResults(results) {
    if (!this.isRunning) return;
    const w = this.canvasEl.width = this.videoEl.videoWidth || 640;
    const h = this.canvasEl.height = this.videoEl.videoHeight || 480;
    this.ctx.clearRect(0, 0, w, h);

    if (!results.poseLandmarks) {
      if (this.onStatusCallback) this.onStatusCallback('No pose detected... get in frame! 📸');
      return;
    }

    const lm = results.poseLandmarks;
    this.drawPose(lm, w, h);
    this.detectRep(lm);
  },

  /* ── Draw Pose Skeleton ── */
  drawPose(landmarks, w, h) {
    const ctx = this.ctx;
    // Draw connections
    const connections = [
      [11,12],[11,13],[13,15],[12,14],[14,16],
      [11,23],[12,24],[23,24],[23,25],[24,26],[25,27],[26,28]
    ];
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 8;
    connections.forEach(([a, b]) => {
      const la = landmarks[a], lb = landmarks[b];
      if (la.visibility > 0.5 && lb.visibility > 0.5) {
        ctx.beginPath();
        ctx.moveTo(la.x * w, la.y * h);
        ctx.lineTo(lb.x * w, lb.y * h);
        ctx.stroke();
      }
    });

    // Draw key landmarks
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#22d3ee';
    [11,12,13,14,15,16,23,24,25,26,27,28].forEach(i => {
      const l = landmarks[i];
      if (l.visibility > 0.5) {
        ctx.beginPath();
        ctx.arc(l.x * w, l.y * h, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#22d3ee';
        ctx.fill();
      }
    });
    ctx.shadowBlur = 0;
  },

  /* ── Calculate Angle Between 3 Points ── */
  calcAngle(a, b, c) {
    const rad = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let deg = Math.abs(rad * 180 / Math.PI);
    if (deg > 180) deg = 360 - deg;
    return deg;
  },

  /* ── Rep Detection ── */
  detectRep(lm) {
    switch (this.exerciseType) {
      case 'pushup': this.detectPushup(lm); break;
      case 'squat': this.detectSquat(lm); break;
      case 'lateral': this.detectLateral(lm); break;
    }
  },

  detectPushup(lm) {
    const lAngle = this.calcAngle(lm[11], lm[13], lm[15]);
    const rAngle = this.calcAngle(lm[12], lm[14], lm[16]);
    const avgElbow = (lAngle + rAngle) / 2;

    if (avgElbow < 90 && this.stage !== 'down') {
      this.stage = 'down';
      if (this.onStatusCallback) this.onStatusCallback('going down... 💀');
    } else if (avgElbow > 150 && this.stage === 'down') {
      this.stage = 'up';
      if (this.onRepCallback) this.onRepCallback();
      if (this.onStatusCallback) this.onStatusCallback('REP! 🔥');
      setTimeout(() => { if (this.stage === 'up') this.stage = 'idle'; }, 300);
    } else if (this.stage === 'idle') {
      if (this.onStatusCallback) this.onStatusCallback('get into push-up position 💪');
    }
  },

  detectSquat(lm) {
    const lAngle = this.calcAngle(lm[23], lm[25], lm[27]);
    const rAngle = this.calcAngle(lm[24], lm[26], lm[28]);
    const avgKnee = (lAngle + rAngle) / 2;

    if (avgKnee < 100 && this.stage !== 'down') {
      this.stage = 'down';
      if (this.onStatusCallback) this.onStatusCallback('ATG baby 🦵');
    } else if (avgKnee > 155 && this.stage === 'down') {
      this.stage = 'up';
      if (this.onRepCallback) this.onRepCallback();
      if (this.onStatusCallback) this.onStatusCallback('REP! 🔥');
      setTimeout(() => { if (this.stage === 'up') this.stage = 'idle'; }, 300);
    } else if (this.stage === 'idle') {
      if (this.onStatusCallback) this.onStatusCallback('stand up straight to begin 🧍');
    }
  },

  detectLateral(lm) {
    const lAngle = this.calcAngle(lm[23], lm[11], lm[15]);
    const rAngle = this.calcAngle(lm[24], lm[12], lm[16]);
    const avgShoulder = (lAngle + rAngle) / 2;

    if (avgShoulder > 70 && this.stage !== 'up') {
      this.stage = 'up';
      if (this.onStatusCallback) this.onStatusCallback('T-POSE ACTIVATED 🦅');
    } else if (avgShoulder < 30 && this.stage === 'up') {
      this.stage = 'down';
      if (this.onRepCallback) this.onRepCallback();
      if (this.onStatusCallback) this.onStatusCallback('REP! 🔥');
      setTimeout(() => { if (this.stage === 'down') this.stage = 'idle'; }, 300);
    } else if (this.stage === 'idle') {
      if (this.onStatusCallback) this.onStatusCallback('arms at your sides to begin 🦅');
    }
  }
};
