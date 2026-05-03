# 🧠 Bombastic Workout App (AR Chaos Edition)

A web-based fitness app that uses your webcam to detect exercise reps with high-energy meme humor and a progressive leveling system.

## 🚀 Features

- **Pose Detection** – MediaPipe Pose tracks your body in real-time for push-ups, squats, and lateral raises.
- **Leveling System** – Rise through the ranks! Start as a **Chud** and grind your way up to **baby gronk**, **goat**, and finally **gigachad**.
- **Rep Counter** – Dynamic countdown with audio cues and motivational (or roasting) voice feedback.
- **Inactivity Detection** – Don't stop moving! If you pause for 5 seconds, you get roasted 💀.
- **Success/Failure Screens** – Confetti celebration for the winners and skull overlays with red-bordered "L" recaps for those who fold.
- **Bombastic UI** – Vibrant glowy text effects and a "bombastic" home screen with scattered, non-overlapping meme backgrounds.

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML5, CSS3, ES6+ JavaScript
- **Vision**: MediaPipe Pose
- **Audio**: Web Speech API & Web Audio API
- **Server**: [serve](https://www.npmjs.com/package/serve)

## 🏃 Quick Start

1. **Run the development server**
   ```bash
   npm run dev
   ```

2. **Access the app**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎮 How to Play

1. **Select Exercise**: Choose between Push-ups, Squats, or Lateral Raises.
2. **Set Target**: Use the +/- buttons to set your rep goal.
3. **Lock In**: Hit **START WORKOUT** and position yourself so the camera can see your full body.
4. **Grind**: Complete your reps to level up! Your progress is saved locally.
5. **Warning**: If you stay inactive for too long or quit early, your "Main Character Arc" will be interrupted.