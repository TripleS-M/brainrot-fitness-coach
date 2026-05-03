/* ── Brainrot Fitness Coach – Main App ── */
const App = {
  /* ── State ── */
  state: {
    exerciseType: 'pushup',
    targetReps: 10,
    currentReps: 10,
    distractionMode: false,
    isWorkoutActive: false,
    screen: 'home',
    result: null,
    lastRepTime: 0,
    totalCompleted: 0
  },

  inactivityTimer: null,
  distractionTimer: null,
  poseReady: false,

  /* ── DOM Refs ── */
  el: {},

  /* ── Boot ── */
  init() {
    this.cacheDOM();
    this.bindEvents();
    this.showScreen('home');
  },

  cacheDOM() {
    const q = (s) => document.querySelector(s);
    this.el = {
      screens: { home: q('#home-screen'), workout: q('#workout-screen'), end: q('#end-screen') },
      exerciseCards: document.querySelectorAll('.exercise-card'),
      repInput: q('#rep-count'),
      repMinus: q('#rep-minus'),
      repPlus: q('#rep-plus'),
      distractionToggle: q('#distraction-toggle'),
      startBtn: q('#start-workout'),
      quitBtn: q('#quit-workout'),
      finishBtn: q('#finish-workout'),
      video: q('#webcam'),
      canvas: q('#pose-canvas'),
      repNumber: q('#rep-number'),
      exerciseLabel: q('#exercise-label'),
      statusText: q('#status-text'),
      distractionOverlay: q('#distraction-overlay'),
      distractionContent: q('#distraction-content'),
      failureOverlay: q('#failure-overlay'),
      successOverlay: q('#success-overlay'),
      confettiCanvas: q('#confetti-canvas'),
      endEmoji: q('#end-emoji'),
      endTitle: q('#end-title'),
      endMessage: q('#end-message'),
      statExercise: q('#stat-exercise'),
      statCompleted: q('#stat-completed'),
      statTarget: q('#stat-target'),
      loadingScreen: q('#loading-screen'),
      failureImage: q('#failure-image'),
      successImage: q('#success-image')
    };
  },

  bindEvents() {
    /* Exercise selection */
    this.el.exerciseCards.forEach(card => {
      card.addEventListener('click', () => {
        this.el.exerciseCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.state.exerciseType = card.dataset.exercise;
      });
    });

    /* Rep counter +/- */
    this.el.repMinus.addEventListener('click', () => {
      const v = Math.max(1, parseInt(this.el.repInput.value) - 1);
      this.el.repInput.value = v;
    });
    this.el.repPlus.addEventListener('click', () => {
      const v = Math.min(100, parseInt(this.el.repInput.value) + 1);
      this.el.repInput.value = v;
    });
    this.el.repInput.addEventListener('change', () => {
      this.el.repInput.value = Math.max(1, Math.min(100, parseInt(this.el.repInput.value) || 10));
    });

    /* Buttons */
    this.el.startBtn.addEventListener('click', () => this.startWorkout());
    this.el.quitBtn.addEventListener('click', () => this.endWorkout('failure'));
    this.el.finishBtn.addEventListener('click', () => {
      this.showScreen('home');
      this.state.result = null;
    });
  },

  /* ── Screen Management ── */
  showScreen(name) {
    Object.values(this.el.screens).forEach(s => s.classList.remove('active'));
    this.el.screens[name].classList.add('active');
    this.state.screen = name;
    this.el.failureOverlay.classList.remove('active');
    this.el.successOverlay.classList.remove('active');
  },

  /* ── Start Workout ── */
  async startWorkout() {
    const reps = parseInt(this.el.repInput.value) || 10;
    this.state.targetReps = reps;
    this.state.currentReps = reps;
    this.state.totalCompleted = 0;
    this.state.distractionMode = this.el.distractionToggle.checked;
    this.state.lastRepTime = Date.now();
    this.state.isWorkoutActive = true;

    /* Update HUD */
    const names = { pushup: 'PUSH-UPS', squat: 'SQUATS', lateral: 'LATERAL RAISES' };
    this.el.exerciseLabel.textContent = names[this.state.exerciseType] || 'EXERCISE';
    this.el.repNumber.textContent = reps;
    this.el.statusText.textContent = 'Loading pose detection... 🧠';

    this.showScreen('workout');

    /* Init pose detection */
    try {
      PoseManager.setExercise(this.state.exerciseType);
      if (!this.poseReady) {
        await PoseManager.init(
          this.el.video, this.el.canvas,
          () => this.onRep(),
          (msg) => { this.el.statusText.textContent = msg; }
        );
        this.poseReady = true;
      } else {
        PoseManager.setExercise(this.state.exerciseType);
        PoseManager.onRepCallback = () => this.onRep();
        PoseManager.onStatusCallback = (msg) => { this.el.statusText.textContent = msg; };
      }
      await PoseManager.start();
      this.el.statusText.textContent = 'Get into position... 📸';
    } catch (err) {
      console.error('Pose init error:', err);
      this.el.statusText.textContent = 'Camera error! Check permissions 😭';
      return;
    }

    /* Start inactivity detection */
    this.startInactivityCheck();

    /* Start distraction mode */
    if (this.state.distractionMode) this.startDistractions();
  },

  /* ── Rep Callback ── */
  onRep() {
    if (!this.state.isWorkoutActive || this.state.currentReps <= 0) return;

    this.state.currentReps--;
    this.state.totalCompleted++;
    this.state.lastRepTime = Date.now();

    /* Update display */
    this.el.repNumber.textContent = this.state.currentReps;
    this.el.repNumber.classList.add('pop');
    setTimeout(() => this.el.repNumber.classList.remove('pop'), 300);

    /* Audio feedback */
    AudioManager.playRepSound();
    const phrase = AudioManager.getRepPhrase();
    AudioManager.speak(phrase);

    /* Check for completion */
    if (this.state.currentReps <= 0) {
      setTimeout(() => this.endWorkout('success'), 600);
    }
  },

  /* ── Inactivity Detection ── */
  startInactivityCheck() {
    this.clearInactivity();
    this.inactivityTimer = setInterval(() => {
      if (!this.state.isWorkoutActive) return;
      if (Date.now() - this.state.lastRepTime > 5000) {
        this.triggerFailure();
      }
    }, 1000);
  },

  clearInactivity() {
    if (this.inactivityTimer) { clearInterval(this.inactivityTimer); this.inactivityTimer = null; }
  },

  triggerFailure() {
    if (!this.state.isWorkoutActive) return;
    /* Show failure overlay */
    
    // Choose random failure image
    const quitImages = ['quit1.jpg', 'quit2.jpg', 'quit3.png'];
    const randomQuit = quitImages[Math.floor(Math.random() * quitImages.length)];
    this.el.failureImage.src = `images/${randomQuit}`;
    this.el.failureImage.style.display = 'block';

    this.el.failureOverlay.classList.add('active');
    AudioManager.playFailureSound();
    AudioManager.speak(AudioManager.getFailPhrase());

    /* After 2.5s, go to end screen */
    setTimeout(() => {
      this.el.failureOverlay.classList.remove('active');
      this.el.failureImage.style.display = 'none';
      this.endWorkout('failure');
    }, 2500);
  },

  /* ── Distraction Mode ── */
  startDistractions() {
    this.clearDistractions();
    const trigger = () => {
      if (!this.state.isWorkoutActive || !this.state.distractionMode) return;
      this.showDistraction();
      const delay = 3000 + Math.random() * 3000;
      this.distractionTimer = setTimeout(trigger, delay);
    };
    this.distractionTimer = setTimeout(trigger, 2000 + Math.random() * 2000);
  },

  clearDistractions() {
    if (this.distractionTimer) { clearTimeout(this.distractionTimer); this.distractionTimer = null; }
    this.el.distractionOverlay.classList.remove('active');
  },

  showDistraction() {
    const text = AudioManager.getDistractionText();
    const emojis = ['💀','🤡','👻','🕷️','😱','🔥','⚡','👀','🫠','💅'];
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];

    this.el.distractionContent.innerHTML =
      `<div class="distraction-emoji">${emoji}</div><div class="distraction-text">${text}</div>`;
    this.el.distractionOverlay.classList.add('active');
    AudioManager.playDistractionSound();

    /* Screen shake */
    document.getElementById('camera-container').classList.add('shake');
    setTimeout(() => {
      document.getElementById('camera-container').classList.remove('shake');
    }, 500);

    /* Hide after 1.5s */
    setTimeout(() => {
      this.el.distractionOverlay.classList.remove('active');
    }, 1500);
  },

  /* ── End Workout ── */
  endWorkout(result) {
    this.state.isWorkoutActive = false;
    this.state.result = result;
    this.clearInactivity();
    this.clearDistractions();
    PoseManager.stop();

    if (result === 'success') {
      this.showSuccessOverlay();
    } else {
      this.showEndScreen();
    }
  },

  showSuccessOverlay() {
    // Choose random success image
    const completedImages = ['completed1.png', 'completed2.png', 'completed3.jpg', 'completed4.jpg'];
    const randomCompleted = completedImages[Math.floor(Math.random() * completedImages.length)];
    this.el.successImage.src = `images/${randomCompleted}`;
    this.el.successImage.style.display = 'block';

    this.el.successOverlay.classList.add('active');
    AudioManager.playSuccessSound();
    AudioManager.speak(AudioManager.getSuccessPhrase());
    ConfettiManager.start('confetti-canvas');
    setTimeout(() => {
      this.el.successOverlay.classList.remove('active');
      this.el.successImage.style.display = 'none';
      ConfettiManager.stop();
      this.showEndScreen();
    }, 3500);
  },

  showEndScreen() {
    const s = this.state;
    const isSuccess = s.result === 'success';
    const names = { pushup: 'Push-Ups', squat: 'Squats', lateral: 'Lateral Raises' };

    this.el.endEmoji.textContent = isSuccess ? '🏆' : '💀';
    this.el.endTitle.textContent = isSuccess ? 'WORKOUT COMPLETE' : 'WORKOUT FAILED';
    this.el.endTitle.className = 'end-title ' + (isSuccess ? 'success' : 'failure');
    this.el.statExercise.textContent = names[s.exerciseType] || s.exerciseType;
    this.el.statCompleted.textContent = s.totalCompleted;
    this.el.statTarget.textContent = s.targetReps;
    this.el.endMessage.textContent = isSuccess
      ? AudioManager.getSuccessPhrase()
      : AudioManager.getFailPhrase();

    this.showScreen('end');

    const phrase = isSuccess ? AudioManager.getSuccessPhrase() : AudioManager.getFailPhrase();
    AudioManager.speak(phrase);
  }
};

/* ── Launch ── */
document.addEventListener('DOMContentLoaded', () => App.init());
