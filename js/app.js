/* ── Brainrot Fitness Coach – Main App ── */
const App = {
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
  el: {},

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
      failFinishBtn: q('#fail-finish'),
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
    this.state.distractionMode = this.el.distractionToggle.checked;
    this.state.isWorkoutActive = false; // Will be set true after countdown

    const names = { pushup: 'PUSH-UPS', squat: 'SQUATS', lateral: 'LATERAL RAISES' };
    this.el.exerciseLabel.textContent = names[this.state.exerciseType] || 'EXERCISE';
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
          if (this.state.distractionMode) this.startDistractions();
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

    const quitImages = ['quit1.jpg', 'quit2.jpg', 'quit3.png'];
    const pick = quitImages[Math.floor(Math.random() * quitImages.length)];
    this.el.failureImage.src = `images/${pick}`;
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

  startDistractions() {
    this.clearDistractions();
    const trigger = () => {
      if (!this.state.isWorkoutActive || !this.state.distractionMode) return;
      this.showDistraction();
      this.distractionTimer = setTimeout(trigger, 3000 + Math.random() * 3000);
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
    document.getElementById('camera-container').classList.add('shake');
    setTimeout(() => document.getElementById('camera-container').classList.remove('shake'), 500);
    setTimeout(() => this.el.distractionOverlay.classList.remove('active'), 1500);
  },

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
    const completedImages = ['completed1.png', 'completed2.png', 'completed3.jpg', 'completed4.jpg'];
    const pick = completedImages[Math.floor(Math.random() * completedImages.length)];
    this.el.successImage.src = `images/${pick}`;
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
    const names = { pushup: 'PUSH-UPS', squat: 'SQUATS', lateral: 'LATERAL RAISES' };
    const exerciseName = names[s.exerciseType] || s.exerciseType;

    if (isSuccess) {
      this.el.endSuccess.style.display = 'flex';
      this.el.endFailure.style.display = 'none';

      this.el.wReps.textContent = s.totalCompleted;
      this.el.wExercise.textContent = exerciseName;
      this.el.wTarget.textContent = s.targetReps;
      this.el.wQuote.innerHTML = `"${AudioManager.getSuccessPhrase()}"`;

      // Show random completed image
      const completedImages = ['completed1.png', 'completed2.png', 'completed3.jpg', 'completed4.jpg'];
      const pick = completedImages[Math.floor(Math.random() * completedImages.length)];
      this.el.endSuccessImg.src = `images/${pick}`;
      this.el.endSuccessImg.style.display = 'block';

      AudioManager.speak(AudioManager.getSuccessPhrase());
    } else {
      this.el.endSuccess.style.display = 'none';
      this.el.endFailure.style.display = 'flex';

      this.el.fTarget.textContent = s.targetReps;
      this.el.fReps.textContent = s.totalCompleted || '???';

      // Show random quit image
      const quitImages = ['quit1.jpg', 'quit2.jpg', 'quit3.png'];
      const pick = quitImages[Math.floor(Math.random() * quitImages.length)];
      this.el.endFailureImg.src = `images/${pick}`;
      this.el.endFailureImg.style.display = 'block';

      AudioManager.speak(AudioManager.getFailPhrase());
    }

    this.showScreen('end');
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
