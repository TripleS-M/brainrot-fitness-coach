/* ── Bombastic Workout App – Main App ── */

/* ── Shared Constants ── */
const EXERCISE_NAMES = { pushup: 'PUSH-UPS', squat: 'SQUATS', lateral: 'LATERAL RAISES' };
const SUCCESS_IMAGES = ['completed1.png', 'completed2.png', 'completed3.jpg', 'completed4.jpg'];
const FAILURE_IMAGES = ['quit1.jpg', 'quit2.jpg', 'quit3.png'];
const LEVELS = ['Chud', 'baby gronk', 'goat', 'gigachad'];

/** Pick a random element from an array. */
function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const App = {
  /* ── Application State ── */
  state: {
    exerciseType: 'pushup',
    targetReps: 10,
    currentReps: 10,
    isWorkoutActive: false,
    screen: 'home',
    result: null,
    lastRepTime: 0,
    totalCompleted: 0
  },

  inactivityTimer: null,
  poseReady: false,
  el: {},
  currentLevelIndex: 0,

  /* ── Initialization ── */
  init() {
    this.cacheDOM();
    this.currentLevelIndex = 0;
    this.updateLevelDisplay();
    this.addRandomEdgeImages();
    this.bindEvents();
    this.showScreen('home');
  },

  /* ── Level System ── */
  updateLevelDisplay() {
    if (this.el.levelName) {
      this.el.levelName.textContent = LEVELS[this.currentLevelIndex];
    }
  },

  incrementLevel() {
    if (this.currentLevelIndex < LEVELS.length - 1) {
      this.currentLevelIndex++;
      this.updateLevelDisplay();
    }
  },

  /* ── Decorative Edge Images (Home Screen) ── */
  addRandomEdgeImages() {
    const COUNT = 9;
    const MIN_DISTANCE = 25; // percentage-point spacing
    const placed = [];

    for (let i = 0; i < COUNT; i++) {
      let attempts = 0;
      let x, y, isLeft, xPerc;

      // Find a non-overlapping position
      while (attempts < 50) {
        isLeft = Math.random() > 0.5;
        xPerc = Math.random() * 25 - 10;
        x = isLeft ? xPerc : 100 - xPerc;
        y = Math.random() * 100 - 10;

        const tooClose = placed.some(p =>
          Math.hypot(p.x - x, p.y - y) < MIN_DISTANCE
        );
        if (!tooClose) break;
        attempts++;
      }
      placed.push({ x, y });

      const img = document.createElement('img');
      img.src = 'images/completed1.png';
      img.className = 'edge-img';
      Object.assign(img.style, {
        position: 'absolute',
        width: `${Math.random() * 150 + 150}px`,
        opacity: '0.75',
        zIndex: '0',
        top: `${y}%`,
        transform: `rotate(${Math.random() * 120 - 60}deg)`,
        pointerEvents: 'none',
        [isLeft ? 'left' : 'right']: `${xPerc}%`
      });
      this.el.screens.home.appendChild(img);
    }
  },

  cacheDOM() {
    const q = (s) => document.querySelector(s);
    this.el = {
      screens: { home: q('#home-screen'), workout: q('#workout-screen'), end: q('#end-screen') },
      exerciseCards: document.querySelectorAll('.exercise-card'),
      repInput: q('#rep-count'),
      repMinus: q('#rep-minus'),
      repPlus: q('#rep-plus'),
      levelName: q('#level-name'),
      startBtn: q('#start-workout'),
      quitBtn: q('#quit-workout'),
      finishBtn: q('#finish-workout'),
      failFinishBtn: q('#fail-finish'),
      video: q('#webcam'),
      canvas: q('#pose-canvas'),
      repNumber: q('#rep-number'),
      exerciseLabel: q('#exercise-label'),
      statusText: q('#status-text'),
      failureOverlay: q('#failure-overlay'),
      successOverlay: q('#success-overlay'),
      confettiCanvas: q('#confetti-canvas'),
      failureImage: q('#failure-image'),
      successImage: q('#success-image'),
      countdownOverlay: q('#countdown-overlay'),
      countdownNumber: q('#countdown-number'),
      // End screen elements
      endSuccess: q('#end-success'),
      endFailure: q('#end-failure'),
      endSuccessImg: q('#end-success-img'),
      endFailureImg: q('#end-failure-img'),
      // Success stats
      wReps: q('#w-reps'),
      wExercise: q('#w-exercise'),
      wTarget: q('#w-target'),
      wQuote: q('#w-quote'),
      // Failure stats
      fTarget: q('#f-target'),
      fReps: q('#f-reps')
    };
  },

  bindEvents() {
    this.el.exerciseCards.forEach(card => {
      card.addEventListener('click', () => {
        this.el.exerciseCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.state.exerciseType = card.dataset.exercise;
      });
    });

    this.el.repMinus.addEventListener('click', () => {
      this.el.repInput.value = Math.max(1, parseInt(this.el.repInput.value) - 1);
    });
    this.el.repPlus.addEventListener('click', () => {
      this.el.repInput.value = Math.min(100, parseInt(this.el.repInput.value) + 1);
    });
    this.el.repInput.addEventListener('change', () => {
      this.el.repInput.value = Math.max(1, Math.min(100, parseInt(this.el.repInput.value) || 10));
    });

    this.el.startBtn.addEventListener('click', () => this.startWorkout());
    this.el.quitBtn.addEventListener('click', () => this.endWorkout('failure'));
    this.el.finishBtn.addEventListener('click', () => this.goHome());
    this.el.failFinishBtn.addEventListener('click', () => this.goHome());
  },

  goHome() {
    this.showScreen('home');
    this.state.result = null;
  },

  showScreen(name) {
    Object.values(this.el.screens).forEach(s => s.classList.remove('active'));
    this.el.screens[name].classList.add('active');
    this.state.screen = name;
    this.el.failureOverlay.classList.remove('active');
    this.el.successOverlay.classList.remove('active');
  },

  async startWorkout() {
    const reps = parseInt(this.el.repInput.value) || 10;
    this.state.targetReps = reps;
    this.state.currentReps = reps;
    this.state.totalCompleted = 0;
    this.state.isWorkoutActive = false; // Set true after countdown

    this.el.exerciseLabel.textContent = EXERCISE_NAMES[this.state.exerciseType] || 'EXERCISE';
    this.el.repNumber.textContent = reps;
    this.el.statusText.textContent = 'Loading pose detection... 🧠';

    this.showScreen('workout');

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

    this.startCountdown();
  },

  startCountdown() {
    this.el.countdownOverlay.classList.add('active');
    let count = 5;

    const tick = () => {
      if (count > 0) {
        this.el.countdownNumber.textContent = count;
        this.el.countdownNumber.classList.remove('pop');
        // Trigger reflow
        void this.el.countdownNumber.offsetWidth;
        this.el.countdownNumber.classList.add('pop');

        AudioManager.playTone(600, 0.1, 'square', 0.1);
        count--;
        setTimeout(tick, 1000);
      } else {
        this.el.countdownNumber.textContent = 'GO!';
        AudioManager.playTone(800, 0.3, 'square', 0.2);

        setTimeout(() => {
          this.el.countdownOverlay.classList.remove('active');
          this.state.isWorkoutActive = true;
          this.state.lastRepTime = Date.now();
          this.startInactivityCheck();
        }, 800);
      }
    };

    tick();
  },

  onRep() {
    if (!this.state.isWorkoutActive || this.state.currentReps <= 0) return;
    this.state.currentReps--;
    this.state.totalCompleted++;
    this.state.lastRepTime = Date.now();

    this.el.repNumber.textContent = this.state.currentReps;
    this.el.repNumber.classList.add('pop');
    setTimeout(() => this.el.repNumber.classList.remove('pop'), 300);

    AudioManager.playRepSound();
    AudioManager.speak(AudioManager.getRepPhrase());

    if (this.state.currentReps <= 0) {
      setTimeout(() => this.endWorkout('success'), 600);
    }
  },

  startInactivityCheck() {
    this.clearInactivity();
    this.inactivityTimer = setInterval(() => {
      if (!this.state.isWorkoutActive) return;
      if (Date.now() - this.state.lastRepTime > 5000) this.triggerFailure();
    }, 1000);
  },

  clearInactivity() {
    if (this.inactivityTimer) { clearInterval(this.inactivityTimer); this.inactivityTimer = null; }
  },

  triggerFailure() {
    if (!this.state.isWorkoutActive) return;
    this.state.isWorkoutActive = false; // Prevent multiple triggers

    this.el.failureImage.src = `images/${pickRandom(FAILURE_IMAGES)}`;
    this.el.failureImage.style.display = 'block';

    this.el.failureOverlay.classList.add('active');
    AudioManager.playFailureSound();
    AudioManager.speak(AudioManager.getFailPhrase());

    setTimeout(() => {
      this.el.failureOverlay.classList.remove('active');
      this.el.failureImage.style.display = 'none';
      this.endWorkout('failure');
    }, 2500);
  },

  endWorkout(result) {
    this.state.isWorkoutActive = false;
    this.state.result = result;
    this.clearInactivity();
    PoseManager.stop();

    if (result === 'success') {
      this.incrementLevel();
      this.showSuccessOverlay();
    } else {
      this.showEndScreen();
    }
  },

  showSuccessOverlay() {
    this.el.successImage.src = `images/${pickRandom(SUCCESS_IMAGES)}`;
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
    const { result, exerciseType, totalCompleted, targetReps } = this.state;
    const exerciseName = EXERCISE_NAMES[exerciseType] || exerciseType;
    const isSuccess = result === 'success';

    this.el.endSuccess.style.display = isSuccess ? 'flex' : 'none';
    this.el.endFailure.style.display = isSuccess ? 'none' : 'flex';

    if (isSuccess) {
      this.el.wReps.textContent = totalCompleted;
      this.el.wExercise.textContent = exerciseName;
      this.el.wTarget.textContent = targetReps;
      this.el.wQuote.innerHTML = `"${AudioManager.getSuccessPhrase()}"`;
      this.el.endSuccessImg.src = `images/${pickRandom(SUCCESS_IMAGES)}`;
      this.el.endSuccessImg.style.display = 'block';
      AudioManager.speak(AudioManager.getSuccessPhrase());
    } else {
      this.el.fTarget.textContent = targetReps;
      this.el.fReps.textContent = totalCompleted || '???';
      this.el.endFailureImg.src = `images/${pickRandom(FAILURE_IMAGES)}`;
      this.el.endFailureImg.style.display = 'block';
      AudioManager.speak(AudioManager.getFailPhrase());
    }

    this.showScreen('end');
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
