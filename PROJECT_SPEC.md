# FitForm – AI Gym Web App – Project Specification

## Tech Stack
- **Framework:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind CSS (custom dark & light glassmorphism design)
- **Theming:** `next-themes` (system-default, user memory, zero hydration flash)
- **Animations:** `framer-motion` (scroll-reveal, staggered waves, layout transitions, reduced-motion compliance)
- **Database:** SQLite via Prisma ORM (file-based, no cloud services)
- **No external accounts, API keys, or cloud services**

## Design Language
Modern glassmorphism:
- **Dark Mode:** Deep midnight radial gradient background, frosted translucent navy cards with backdrop-blur, soft borders, subtle indigo/cyan glow, rounded corners.
- **Light Mode:** Luminous pastel gradient background, white frosted cards with soft shadows, subtle borders, high-contrast dark slate text for effortless readability.
- **Responsive:** Fluid layout from mobile phone screens to widescreen desktop displays.

---

## Theming & Animation Architecture

### 1. Theme System (`next-themes`)
- **Theme Provider:** Wrapped in [`src/components/ThemeProvider.tsx`](file:///c:/Users/Sanskar/Desktop/cep2/src/components/ThemeProvider.tsx) with `attribute="class"`, `defaultTheme="system"`, and `enableSystem={true}`.
- **Theme Variables:** Defined in [`src/app/globals.css`](file:///c:/Users/Sanskar/Desktop/cep2/src/app/globals.css) via CSS custom properties (`--card-bg`, `--card-border`, `--foreground`, `--background`, `--input-bg`, etc.).
- **Theme Toggle:** [`src/components/ThemeToggle.tsx`](file:///c:/Users/Sanskar/Desktop/cep2/src/components/ThemeToggle.tsx):
  - In the Navbar: Sun/Moon button on all pages with smooth rotation/scale micro-animations.
  - On `/onboarding`: Floating top-right toggle since the main navbar is hidden.
  - Behavior: Defaults to device setting, persists user choice in `localStorage`, zero theme flash.

### 2. Radiating Lines Ambient Background
- Component: [`src/components/AnimatedBackground.tsx`](file:///c:/Users/Sanskar/Desktop/cep2/src/components/AnimatedBackground.tsx)
- Context & Hook: [`src/context/BackgroundContext.tsx`](file:///c:/Users/Sanskar/Desktop/cep2/src/context/BackgroundContext.tsx) (`useBackground()`)
- Renders:
  - 80 thin gradient lines radiating outward from an off-center origin (~70% X, ~35% Y).
  - Soft glowing origin dot with luminous core.
  - Theme-aware palette: cyan (`rgb(6, 182, 212)`), violet (`rgb(139, 92, 246)`), and blue (`rgb(59, 130, 246)`) in dark mode; soft indigo (`rgb(99, 102, 241)`), pink (`rgb(236, 72, 153)`), and lavender in light mode.
  - Very gentle breathing effect where line lengths vary slightly over time.
  - Slow system rotation with randomized direction and smooth speed easing every 20–40 seconds (no abrupt jumps).
- Performance & Accessibility:
  - Single HTML canvas strictly capped at 30 FPS.
  - `devicePixelRatio` clamped to 1.5 to protect CPU and battery life on high-res displays.
  - Completely pauses rendering when the browser tab is hidden (`document.hidden`).
  - Respects `prefers-reduced-motion`: renders a single frozen static frame without running continuous animation loops.
  - Fixed behind all content with `pointer-events-none -z-10`, never obstructing clicks or hurting text readability.

#### Background Modes (`full`, `static`, `off`)
The component accepts a `mode` prop and connects to `useBackground()` context:
- `mode="full"` (default): Runs the gentle 30 FPS rotation, breathing, and speed easing.
- `mode="static"`: Draws one single frozen frame with zero ongoing animation (ideal for Step 3 live camera pages to reserve 100% GPU for MediaPipe pose estimation).
- `mode="off"`: Renders nothing.

Usage example for pages:
```tsx
import { useEffect } from 'react';
import { useBackground } from '@/context/BackgroundContext';

export default function CameraWorkoutPage() {
  const { setMode } = useBackground();

  useEffect(() => {
    // Freeze background animation to static frame during camera usage
    setMode('static');
    return () => setMode('full');
  }, [setMode]);

  return <div>... live camera tracking ...</div>;
}
```

### 3. Scroll-Reveal & Interaction Animations (`framer-motion`)
- Staggered wave entrance for Day 1 to Day 30 cards on `/plan`.
- Staggered fade-and-slide entrance for telemetry rows on `/logs`.
- Section animations on `/onboarding`.
- Micro-interactions:
  - Cards: `whileHover={{ y: -3 }}` with glowing border effect.
  - Buttons: `whileTap={{ scale: 0.98 }}`.
  - Navbar: Sliding active link indicator (`layoutId="navbar-indicator"`).
- Automatically checks `useReducedMotion()` from `framer-motion` to disable transforms when reduced-motion is requested.

---

## Build Order & Steps

### Step 1 – Core App (COMPLETED)
1. **Onboarding page (`/onboarding`)**
   - Fields: name, age, gender (male/female/other), height (cm), weight (kg), goal (fat loss/muscle gain/maintain), experience (beginner/intermediate/advanced), workout days per week (3–6).
   - Validation: age 13–80, height 100–230 cm, weight 30–250 kg. Clear error messages. Never save invalid data.
   - On submit → save user + generate 30-day plan + save plan → redirect to `/plan`.

2. **Plan generation (deterministic, no AI)**
   - Exactly 30 days. Rest days based on days-per-week; every 7th day is lighter (active recovery/rest).
   - Difficulty rises each week (more sets/reps or shorter rest).
   - Goal templates: fat loss (circuit, high reps, 30s rest), muscle gain (strength, low reps, more sets, 150s rest), maintain (balanced, 60s rest).
   - Primary exercises: squat, push-up, bicep curl, lunge, plank. Extras: jumping jacks, glute bridge, mountain climbers (marked "form check coming later").
   - Each exercise: name, target muscles, sets, reps (or seconds), rest seconds.
   - Volume adjusted by experience level.
   - Exercise data in a single separate file ([`src/lib/exerciseData.ts`](file:///c:/Users/Sanskar/Desktop/cep2/src/lib/exerciseData.ts)).

3. **Interactive Glass Timeline Page (`/plan`)**
   - Vertical timeline layout with central glowing glass spine line (centered on desktop with alternating cards, left-aligned on mobile).
   - Grouped into 5 weeks with sticky week headers ("Week 1 · Foundation", "Week 2 · Build", "Week 3 · Push", "Week 4 · Peak", "Week 5 · Finale") showing completed day counts and circular SVG progress rings.
   - Distinct spine node anchor states:
     - **Completed:** Filled glowing emerald circle with white check icon.
     - **Up next:** First incomplete workout day with pulsing ring indicator and glowing tag.
     - **Workout day not started:** Clean hollow ring with subtle center indicator.
     - **Rest or recovery day:** Shorter compact card with coffee/moon icon and mobility guidance.
   - Frosted glass cards with exercise chips, estimated workout duration, and accent hover glow.
   - Scroll-linked glowing spine track pre-filled up to the last completed day on load.
   - Smooth auto-scroll on page load to the "Up next" day + floating "Jump to Up next" button.
   - Clicking any day card opens `/plan/[day]` with full sets, reps, and form guidance.

4. **Navigation bar** on every page except onboarding: Workout, Diet, Logs. Highlights current page with sliding Framer Motion pill.
   - Diet page (`/diet`): placeholder "Coming in Step 2".

5. **Logs page (`/logs`)**
   - Table of workout logs (newest first), empty state message.
   - "Export JSON" and "Export CSV" buttons.
   - Dev-only "Add test log" button that saves a sample log.
   - Log fields: user name, day, exercise, set, reps, form_score, mistakes, rest_seconds, mode (live_camera/video_upload), datetime.
   - After every log write → regenerate `data/workout_logs.json` from DB.

6. **Returning users**
   - Browser remembers user (localStorage). Profile exists → go to `/plan`.
   - "Create new profile" option. Support multiple profiles.

7. **Theme & Animation Layer**
   - Dark & Light mode toggle with system preference sync and zero hydration flash.
   - Animated drifting gradient blobs + canvas particle background.
   - Scroll-reveal staggered cards, table rows, and interactive hover lifts.

### Step 2 – Diet by Budget Page (COMPLETED)
1. **Editable Food Database (`src/lib/foodData.ts`)**
   - 37 affordable, staple Indian foods with authentic Hindi names, portion sizes, prices in INR (₹), calories, protein, carbs, fat, category (`protein`, `carb`, `vegetable`, `fruit`, `fat`), and diet type (`vegetarian`, `eggetarian`, `non-vegetarian`).
   - Includes price/nutrition disclaimer note on UI: *"Prices and nutrition values are approximate and can be edited in foodData.ts"*.
   - Engineered for reuse by the Step 8 calorie tracker.
   - Built-in ranking function for top cost-efficient protein sources (`proteinPerRupee`).

2. **Scientific Nutrition Calculator (`src/lib/nutrition.ts`)**
   - BMR computed via the gold-standard **Mifflin-St Jeor equation**:
     - Men: `(10 × weight_kg) + (6.25 × height_cm) - (5 × age) + 5`
     - Women: `(10 × weight_kg) + (6.25 × height_cm) - (5 × age) - 161`
   - TDEE Activity Multipliers calibrated to workout days per week:
     - 3 days: 1.375 (moderately active)
     - 4–5 days: 1.55 (active)
     - 6 days: 1.725 (very active)
   - Goal Adjustments:
     - Fat loss: -400 kcal deficit (with strict safety floor of 1200 kcal for women, 1500 kcal for men)
     - Muscle gain: +300 kcal surplus
     - Maintain: 0 kcal adjustment
   - Macronutrient Distribution:
     - Protein: 2.0 g/kg (muscle gain), 1.8 g/kg (fat loss), 1.5 g/kg (maintain)
     - Fats: 25% of daily target calories (9 kcal/g)
     - Carbs: Remainder of daily target calories (4 kcal/g)
   - Plain-language explanations displayed clearly for beginners.

3. **Deterministic Meal Planner (`src/lib/mealPlanner.ts`)**
   - Zero AI, zero random or unpredictable calls. 100% deterministic optimization.
   - Splits nutrition across 4 distinct meals: Breakfast, Lunch, Evening Snack, Dinner.
   - Respects user budget cap, diet type, and excluded foods.
   - Variety algorithm prevents excessive repetition of any single ingredient across meals.
   - Honest budget diagnostics: when budget is low, displays transparent status message (e.g. *"With ₹70/day, you can reach about 66% of your daily protein target..."*) alongside actionable recommendations.
   - Interactive Food Swapping: users can swap any individual food item for a nutritionally comparable alternative in the same category without breaking budget constraints.

4. **Diet Page (`/diet`) & Persistence**
   - Interactive budget slider (₹30 to ₹600/day) with direct number input.
   - Diet type selector (Vegetarian, Eggetarian, Non-Vegetarian).
   - Multi-select food exclusion filter.
   - Memory: persists choices per user in `localStorage`.
   - Cards:
     - Mifflin-St Jeor breakdown card with plain-language metabolic guidance.
     - Honest budget diagnostics with animated target progress bars (Cost, Calories, Protein).
     - 4 Meal Cards with quantity, calories, protein, price, and functional Swap buttons.
     - Top Cheapest Indian Protein Sources table ranked by protein per rupee.
     - Previous Saved Plans history list.
     - Medical guidance disclaimer.
   - Export: one-click "Export Diet JSON" with formatted `attachment` download.
   - Persists all generated diet plans to SQLite `DietPlan` table.

### Step 3A – Workout Flow & Live Camera Squat Form Checking (COMPLETED)
1. **Interactive Workout Flow (`/workout/[day]`)**
   - Launched directly from `/plan/[day]` via the enabled "Start Workout" button on workout days.
   - Stepper walks through prescribed exercises set-by-set (Set N of Total Sets, Goal Reps, Target Muscles).
   - "Check My Form" modal:
     - "Live Camera": Available for Squat exercises using on-device MediaPipe Pose.
     - "Upload Video": Disabled and labeled "Coming in Step 7".
     - Non-squat exercises: Labeled "Form check coming soon" with manual reps logging fallback.
   - Saves completed sets via `POST /api/logs` with `mode: "live_camera"` (with form scores) or `mode: "manual"` (with `formScore: null`, displayed as "Not scored").
   - "Set Complete" card displays reps logged, form score, and mistake feedback notes with a "Next Set" transition button.
   - Entire day counts as completed on the timeline when all sets are logged.

2. **On-Device MediaPipe Pose Engine (Zero External CDN Runtime Dependency)**
   - Model file: [`public/mediapipe/models/pose_landmarker_lite.task`](file:///c:/Users/Sanskar/Desktop/cep2/public/mediapipe/models/pose_landmarker_lite.task) (5.51 MB).
   - WASM binaries: [`public/mediapipe/wasm/`](file:///c:/Users/Sanskar/Desktop/cep2/public/mediapipe/wasm/) (`vision_wasm_internal.wasm`, `vision_wasm_nosimd_internal.wasm`).
   - Privacy guarantee clearly displayed: *"Your camera video stays on your device"*.
   - Camera permission handling with clear error diagnostics (Denied, Not Found, In Use).
   - Mirrored video feed with real-time skeleton overlay (joints and glowing bones).
   - Dynamic video boundary glow (Green = Good Form, Amber = Warning/Mistake, Red = Critical/Out of Frame).
   - Detection throttled to ~20 FPS for minimal CPU/GPU load.
   - Sets global animated background to `"static"` mode during camera tracking.

3. **Biomechanical Squat Analysis & Rep Counting Engine**
   - Config file: [`src/lib/pose/squatConfig.ts`](file:///c:/Users/Sanskar/Desktop/cep2/src/lib/pose/squatConfig.ts) (all thresholds in one place).
   - Detector: [`src/lib/pose/squatDetector.ts`](file:///c:/Users/Sanskar/Desktop/cep2/src/lib/pose/squatDetector.ts) state machine (`STANDING` -> `DESCENDING` -> `BOTTOM` -> `ASCENDING` -> `STANDING`).
   - Angle math: [`src/lib/pose/angleMath.ts`](file:///c:/Users/Sanskar/Desktop/cep2/src/lib/pose/angleMath.ts) (interior joint angles, torso lean from vertical, knee vs toe travel, EMA jitter filter).
   - Rules:
     - **Depth:** Knee angle at bottom must reach below ~100°; otherwise flags "Not deep enough" (-25 pts).
     - **Back Lean:** Torso angle from vertical must stay under ~45°; otherwise flags "Leaning too far forward" (-20 pts).
     - **Tempo / Speed:** Descent faster than 950ms flags "Too fast — control your descent" (-15 pts).
     - **Knee Past Toes:** Evaluated only when foot landmark confidence is high ($\ge 0.75$) to prevent false flags.
     - **Body-in-Frame:** Shows "Step back, we can't see your full body" when key landmarks have low confidence.
     - **Auto-Finish:** Automatically completes set after 8 seconds of inactivity once at least 1 rep is logged.

4. **Testing Suite & Developer Pose Simulation Studio (`/dev/pose-test`)**
   - Unit tests ([`tests/squatDetector.test.ts`](file:///c:/Users/Sanskar/Desktop/cep2/tests/squatDetector.test.ts)) with Vitest verifying 6 synthetic scenarios (Perfect Squat, Shallow Squat, Forward Lean, Fast Descent, Stationary Jitter, Out of Frame).
   - Interactive developer preview studio at `/dev/pose-test` to scrub, step through, and replay synthetic landmark frames with live telemetry and DB test logging without a physical webcam.

### Step 3B-1 – Reusable Form Checker Architecture, Push-Up & Bicep Curl (COMPLETED)
1. **Reusable Exercise Analyzer Pattern (`src/lib/pose/`)**
   - Universal interface [`IExerciseAnalyzer`](file:///c:/Users/Sanskar/Desktop/cep2/src/lib/pose/types.ts) and types ([`src/lib/pose/types.ts`](file:///c:/Users/Sanskar/Desktop/cep2/src/lib/pose/types.ts)).
   - Shared configuration file [`src/lib/pose/exerciseConfig.ts`](file:///c:/Users/Sanskar/Desktop/cep2/src/lib/pose/exerciseConfig.ts) maintaining biomechanical thresholds, timings, deductions, and messages for all exercises.
   - Dynamic exercise registry factory [`src/lib/pose/analyzers/registry.ts`](file:///c:/Users/Sanskar/Desktop/cep2/src/lib/pose/analyzers/registry.ts) (`createExerciseAnalyzer`, `resolveExerciseId`, `isExerciseFormTrackable`).
   - Self-contained analyzers:
     - [`SquatAnalyzer`](file:///c:/Users/Sanskar/Desktop/cep2/src/lib/pose/analyzers/squatAnalyzer.ts): complete squat biomechanics, depth, torso lean, knee/toe balance.
     - [`PushUpAnalyzer`](file:///c:/Users/Sanskar/Desktop/cep2/src/lib/pose/analyzers/pushUpAnalyzer.ts): side-view push-up with 1.5s plank stability hold, elbow flexion (<90°), and body line alignment (>160°).
     - [`BicepCurlAnalyzer`](file:///c:/Users/Sanskar/Desktop/cep2/src/lib/pose/analyzers/bicepCurlAnalyzer.ts): side-view single-arm bicep curl with customizable arm selection, full curl (<50°), full extension (>150°), and anti-swing checks (<15°).

2. **Universal Live Camera Screen ([`src/components/pose/LiveExerciseCamera.tsx`](file:///c:/Users/Sanskar/Desktop/cep2/src/components/pose/LiveExerciseCamera.tsx))**
   - Automatically resolves analyzer and loads local on-device MediaPipe PoseLandmarker model (zero CDN).
   - Dynamic real-time telemetry meters tailored to the active exercise (e.g. Knee Depth & Torso Lean; Elbow Angle & Body Alignment; Elbow Curl & Torso Swing).
   - Interactive Left/Right arm selector for Bicep Curl with `localStorage` persistence.
   - Real-time 1.5s plank hold progress countdown for Push-Up.
   - Dynamic video border glow (green = good form, amber = warning, red = mistake/out of frame).
   - 8-second stationary auto-finish once $\ge 1$ rep is logged.
   - Backwards-compatibility wrapper [`LiveSquatCamera.tsx`](file:///c:/Users/Sanskar/Desktop/cep2/src/components/pose/LiveSquatCamera.tsx) maintained.

3. **Workout Flow Integration ([`src/app/workout/[day]/page.tsx`](file:///c:/Users/Sanskar/Desktop/cep2/src/app/workout/[day]/page.tsx))**
   - Live camera form check unlocked for **Squat**, **Push-Up**, and **Bicep Curl**.
   - **Walking / Static Lunge** and **Forearm Plank** continue to show *"Form Check Coming Soon"* with clean manual set logging.
   - Automatic log synchronization to SQLite database, `data/workout_logs.json`, and CSV/JSON exports.

4. **Testing & Simulation Studio Upgrade**
   - 22 Vitest unit tests in [`tests/exerciseAnalyzers.test.ts`](file:///c:/Users/Sanskar/Desktop/cep2/tests/exerciseAnalyzers.test.ts) and [`tests/squatDetector.test.ts`](file:///c:/Users/Sanskar/Desktop/cep2/tests/squatDetector.test.ts) covering perfect reps, shallow depths, sagging hips, swinging torsos, fast tempos, plank holds, and edge cases.
   - Developer Simulation Studio at [`/dev/pose-test`](file:///c:/Users/Sanskar/Desktop/cep2/src/app/dev/pose-test/page.tsx) upgraded with 14 synthetic scenarios across all supported exercises with visual playback, scrubbing, and test logging.

### Step 3B-2 – Form Checking for Lunge & Forearm Plank (COMPLETED)
1. **Lunge Analyzer (`src/lib/pose/analyzers/lungeAnalyzer.ts`)**
   - Side-view camera placement guide: *"Stand side-on, 2 to 3 metres away, full body visible, with room to step forward"*.
   - Intelligent front-leg detection: auto-determines front leg by comparing ankle positions in facing direction, with an on-screen toggle pill (`[Auto | Left | Right]`) for manual override.
   - Rep counting: triggers on descent below 140°, counts 1 rep when front knee bends below ~100° and person returns to standing (>155°).
   - Biomechanical mistake detection:
     - *"Not deep enough"*: Lowest knee angle fails to reach below 100° (-25 pts).
     - *"Leaning too far forward"*: Torso forward lean angle exceeds 25° from vertical (-20 pts).
     - *"Knee too far past your toes"*: Evaluated when foot landmark confidence $\ge 0.75$ (-15 pts).
     - *"Too fast"*: Descent completed in under 850ms (-15 pts).
   - Inactivity auto-finish: completes set after 8 seconds of stationary standing once $\ge 1$ rep is recorded.

2. **Forearm Plank Analyzer (`src/lib/pose/analyzers/plankAnalyzer.ts`)**
   - Side-view camera placement guide: *"Place the camera low and side-on, 2 metres away, whole body visible"*.
   - Stability gatekeeper: requires maintaining a stable plank posture for 2.0 seconds before starting the timer, avoiding false starts.
   - Large live timer displaying active hold seconds against target duration from the plan (e.g. `24s / 45s`).
   - Biomechanical alignment & mistakes:
     - Evaluates shoulder-hip-ankle collinearity (target $\ge 165^\circ$).
     - *"Hips sagging"*: Hip drops below the shoulder-ankle plane (-20 pts).
     - *"Hips too high"*: Hip pikes above the shoulder-ankle plane (-20 pts).
     - *"Head dropping"*: Nose drops $>12$ cm below shoulder line when head confidence $\ge 0.75$ (-10 pts).
   - Live hold-quality scoring: percentage of hold time maintained in clean form scaled to 100.
   - Auto-finish: completes automatically when target hold time is reached or after a 3.0s dismount window when user stands up or leaves the frame.

3. **Database Schema & Timed Hold Logging Migration**
   - Non-destructive SQLite migration adding optional `durationSeconds Int?` to `WorkoutLog` in Prisma schema, preserving all existing rows.
   - Dedicated timed hold logging: plank sets record duration in `durationSeconds` with reps set to 0.
   - UI formatting across `/logs`: plank logs display hold time formatted in seconds (e.g. `"45 s"`) with a dedicated "Reps / Hold" table header.
   - File synchronization: `data/workout_logs.json` automatically writes `durationSeconds`.
   - Data exports: CSV export includes dedicated `Duration (s)` column; JSON export includes `durationSeconds`. Full backward compatibility maintained for older logs.

4. **Universal Workout Flow Wiring**
   - All 5 primary exercises (**Squat**, **Push-Up**, **Bicep Curl**, **Lunge**, **Plank**) are now fully unlocked with the Live Camera.
   - Auxiliary exercises (jumping jacks, glute bridge, mountain climbers) remain safely on manual logging.
   - Set completion card displays hold time in seconds for timed exercises, and reps for rep-based exercises.

5. **Testing Suite Expansion**
   - 33 comprehensive Vitest tests passing with 0 failures (`tests/exerciseAnalyzers.test.ts` & `tests/squatDetector.test.ts`).
   - Synthetic test sequences in `src/lib/pose/syntheticData.ts` and `/dev/pose-test` covering:
     - Lunge: Perfect rep, shallow descent, forward torso lean, fast descent.
     - Plank: 2.0s stability hold, clean hold, sagging hips, early dismount.
   - Verified backward compatibility across Squat, Push-Up, Bicep Curl, Diet Planner, and Timeline.

### Step 4 – Voice Corrections + Rest Timer (COMPLETED)
1. **Timestamp-Accurate Glass Rest Timer (`src/components/workout/RestTimerScreen.tsx`)**
   - Shows after a set is saved (live camera or manual entry).
   - Base countdown on real timestamps (`Date.now()` vs target end time) to ensure immunity to browser background tab throttling.
   - Large circular SVG countdown ring with smooth stroke dash offset and digital seconds counter.
   - Dynamic exercise cues and tips tailored to the upcoming exercise (`getExerciseTip()`).
   - Rest controls:
     - Minus and plus 15-second quick adjustments (`-15s`, `+15s`).
     - Preset chips (`30s`, `60s`, `90s`, `2 min`, `3 min`).
     - Quick `+30s` extension button during active countdown.
     - Pause and Resume states with frozen timestamp delta.
     - Skip rest button to immediately advance.
     - "Reset to recommended" chip restoring the plan's default rest.
   - Profile & exercise memory: remembers chosen rest preferences per exercise and per user profile in `localStorage` (`src/lib/workout/restPreferences.ts`).
   - Web Audio API synthesizer tones & mobile haptics (`src/lib/voice/soundEffects.ts`):
     - Soft chime at 10 seconds remaining.
     - Distinct alert beeps on 3, 2, and 1 / GO.
     - Gentle mobile vibration pattern (`navigator.vibrate`) where supported.
   - Rest duration persistence:
     - Measures actual seconds rested and saves them to SQLite DB, `data/workout_logs.json`, and CSV/JSON exports via `PATCH /api/logs`.
   - Browser gesture compliance: Rest countdown finishes with a clear "Ready! Start Set" button press, ensuring subsequent camera and speech actions have required browser user activation.
   - Battery & GPU conservation: Webcam stream tracks are paused/stopped and pose detection is halted during the rest period.

2. **Workout Complete Celebration (`src/components/workout/WorkoutSummaryCard.tsx`)**
   - Triggers when the final set of the final exercise of the day is saved (does not show rest timer).
   - Rich celebration card presenting:
     - Total exercises completed and total sets logged.
     - Total reps and cumulative plank hold time.
     - Overall average biomechanical form score.
     - Top recurring form mistakes identified across sets.
     - Total elapsed workout duration in minutes.
     - Direct button to return to the interactive plan timeline (`/plan`).

3. **Centralized Voice & Speech Engine (`src/lib/voice/`)**
   - Centralized concise phrase dictionary (`phrases.ts`) with all cues under 8 words for Squat, Push-Up, Bicep Curl, Lunge, and Plank.
   - Prioritized speech scheduler (`speechScheduler.ts`):
     - Uses standard browser `window.speechSynthesis`.
     - Single-queue anti-overlap policy (cancels stale utterance if priority permits).
     - 8-second cooldown per distinct mistake to eliminate repetitive nagging.
     - 3-second spacing interval between consecutive spoken phrases.
     - Plank milestone announcements (e.g. *"10 seconds left"*, *"Target reached, hold strong"*).
     - Positive reinforcement cues on every 3rd consecutive clean rep without mistakes.
     - Accessible live on-screen visual captions for hearing-impaired users or noisy gym environments.
     - Workaround for Chromium speech synthesis garbage-collection bug.

4. **Voice & Sound Settings Modal (`src/components/voice/VoiceSettingsModal.tsx`)**
   - Accessible via speaker button on Navbar, Camera Screen, and Rest Timer.
   - Settings:
     - Voice coaching toggle (on/off).
     - Natural browser voice picker (filters to best English voice by default).
     - Speech rate / speed slider (0.8x to 1.3x).
     - Volume slider (0% to 100%).
     - Countdown beeps toggle (on/off).
     - Rep count announcements toggle (on/off).
     - "Test voice" interactive audition button.
   - Settings persisted per user profile in `localStorage`.

5. **Testing & Verification Suite**
   - 48 automated Vitest unit & integration tests (`tests/speechAndRestTimer.test.ts`, `tests/squatDetector.test.ts`, `tests/exerciseAnalyzers.test.ts`).
   - Simulation Studio upgraded at `/dev/pose-test` with audio simulator, mistake triggers, and rest timer modal preview launcher.
   - End-to-end flow test script `scripts/testStep4Flow.mjs` verifying log creation, `PATCH /api/logs` rest seconds update, JSON mirror sync, and CSV exports.

### Step 5 – Streaks/Badges + Progress Dashboard (COMPLETED)
1. **Personal Analytics Dashboard (`/progress` & Navbar Link)**
   - Added "Progress" link to top navigation bar (`Workout, Diet, Progress, Logs`) with theme-aware sliding indicator.
   - Glassmorphic personal dashboard with staggered entrance animations (`framer-motion`), fully responsive across phone and laptop.
   - Empty state ("Complete your first workout to see progress here") with quick link to Day 1 plan.
   - Headline metric summary cards:
     - Average biomechanical form score.
     - Best recorded set with score, exercise, and reps.
     - Total reps logged + plank hold seconds.
     - Estimated time under iron in minutes.

2. **Streak Engine & Program Heatmap (`src/lib/progress/streakCalculator.ts`)**
   - Rules centralized in one commented file:
     - A day counts as "done" when the plan day's workout is completed.
     - Planned rest and recovery days do NOT break the streak.
     - Skipping a planned workout day breaks the streak.
     - Uses local date (`YYYY-MM-DD`), handling timezone and midnight boundary transitions cleanly.
   - Metric outputs: Current streak, longest streak, total workouts completed.
   - "This Week" 7-day row with status indicators (`done`, `rest`, `missed`, `upcoming`).
   - 30-Day Program Calendar Heatmap color-coded by form score ($\ge 90\%$, $75-89\%$, $<75\%$) and rest/missed days.
   - Encouraging risk warning when today's scheduled workout is still pending.

3. **14 Milestone Badges System (`src/lib/progress/badgesConfig.ts`)**
   - Centralized registry defining 14 badges with deterministic evaluation rules:
     - *First Step* (first workout session completed)
     - *3-Day Momentum*, *7-Day Champion*, *2-Week Iron Habit* (3, 7, 14-day streaks)
     - *Full Week Clean Sweep* (completed all planned workouts in a week)
     - *Halfway Hero* (Day 15 completed)
     - *30-Day Legend* (all 30 days completed)
     - *Biomechanical Precision* (first set scored $\ge 90\%$)
     - *Master of Form* (5 sets scored $\ge 90\%$)
     - *Squat Master* (100 squat reps)
     - *Push-up Pro* (100 push-up reps)
     - *Iron Plank* (300 seconds of cumulative forearm plank hold)
     - *Dietary Strategist* (saved first personalized diet plan)
     - *The Comeback* (completed a workout after a missed day)
   - Stable unlock timestamps persisted in `UserBadge` table (`prisma/schema.prisma`).
   - Badge Wall displaying unlocked badges in vibrant metallic glass style with earned date, and locked badges greyed out with live percentage progress bars.
   - Celebratory popup modal (`BadgeUnlockModal.tsx`) with glow animation shown once per badge (respects `prefers-reduced-motion`).

4. **Recharts Visualizations (`src/components/progress/`)**
   - **Form Score Progression (`FormScoreChart.tsx`)**: Daily average form scores over time with a linear regression trend line and an interactive per-exercise filter dropdown.
   - **Bodyweight Tracking (`WeightChart.tsx`)**: Historical bodyweight progression graph with starting vs current weight delta calculation ("-2.1 kg"). Includes inline "Log Today's Weight" form and JSON export download.
   - **Weekly Volume & Consistency (`VolumeChart.tsx`)**: Bar chart comparing total reps and plank hold seconds, as well as planned vs completed workout consistency per week.
   - **Biomechanical Mistakes Breakdown (`MistakesBreakdownChart.tsx`)**: Horizontal bar chart of top technique errors with a plain-language coaching tip targeting the #1 mistake.

5. **Weight Tracking & SQLite Migration (`src/app/api/weight/route.ts`)**
   - Added `WeightEntry` table (`userId`, `weightKg`, `date`, `recordedAt`) with safe non-destructive migration preserving all existing rows.
   - Initial onboarding weight auto-seeded as day-1 entry.
   - 30 kg to 250 kg input validation; allows 1 entry per day, editable for today.
   - JSON export format endpoint (`GET /api/weight?format=json`).

6. **Development-Only Demo Data Tool (`src/app/api/dev/demo-data/route.ts`)**
   - Clearly labelled "Load demo data" button (visible only in dev mode).
   - Generates an isolated "Demo User" profile with ~3 weeks of realistic history (gradual form score improvement from 76% to 96%, planned rest days, an intentionally missed day triggering Comeback badge, and a -2.1 kg weight drop).
   - "Delete demo data" button that cleans up only the demo profile and its records. Real user profiles are never mixed or modified.

7. **Verification & Testing**
   - 69 Vitest unit & integration tests passing with 0 failures across 4 test suites (`tests/streaksAndBadges.test.ts`, `tests/speechAndRestTimer.test.ts`, `tests/squatDetector.test.ts`, `tests/exerciseAnalyzers.test.ts`).
   - TypeScript compiler (`tsc --noEmit`) and ESLint (`npm run lint`): 0 errors or warnings.
   - Production Next.js build (`npm run build`) succeeded.
   - Automated end-to-end verification script (`scripts/testStep5Flow.mjs`) verified demo profile generation, metrics, badges, weight validation, JSON export, and cleanup.

### Step 5B – Real Biometric Analytics Engine, Data Collection & Trustworthy Dashboard (COMPLETED)
1. **Complete Database Audit & Zero Placeholder Guarantee**
   - Audited every value and calculation across `/progress`, badges, and streak logic. Removed all hardcoded demo/placeholder numbers. Every metric is computed strictly from database records (`WorkoutLog`, `WeightEntry`, `WorkoutDay`, `User`, `WorkoutFeedback`).
   - **Streak vs Week Row Bug Fixed:** Resolved synchronization bug where an 8-day streak showed only Sunday as done on the week dots. The week row now maps streak progression across the 7-day window ending today so that active streaks never leave prior days blank.
   - **Profile Data Isolation Verified:** Audited SQLite database `prisma/dev.db`. Verified zero demo data leakage into user Sanskar (ID 3 has 46 logs and 1 weight entry; Demo User has 75 isolated logs flagged with `isDemo: true`).

2. **Expanded Biometric Data Collection (Safe Schema Migrations)**
   - **User Profile:** Added optional `targetWeightKg` (30–250 kg) and `waistCm` (40–200 cm) in onboarding and via a dismissible `ProfileCompletionCard` on `/progress` (`PATCH /api/users`).
   - **Set Load Tracking:** Added optional `loadKg` (0–300 kg) on the workout logging screen with per-exercise `localStorage` memory. Old logs without load default to bodyweight. Included in `/logs`, CSV/JSON exports, and `data/workout_logs.json`.
   - **Workout Effort (RPE) Survey:** Added 5-level RPE survey ("How did it feel?" Very Easy, Easy, Moderate, Hard, Very Hard) with skippable option on `WorkoutSummaryCard` after the final set. Saved to SQLite `WorkoutFeedback` table via `POST /api/workout/feedback`.
   - **Weekly Body Measurements Check-in:** Added weekly check-in card (`WeeklyCheckInCard.tsx`) on `/progress` for logging weight (kg), waist (cm), chest (cm), hips (cm), and arm (cm). Fully validates input ranges and supports inline history.

3. **Unified Real Metrics Calculator (`src/lib/progress/metricsCalculator.ts`)**
   - **Consistency %:** (Completed Workouts ÷ Planned Workouts) × 100 with weekly adherence breakdown. Planned rest days are protected and never break streaks.
   - **Strength Volume & PRs:** Volume = Reps × Load (kg), with bodyweight tracked directly as reps. Personal Records per exercise track highest reps and heaviest load with glowing "New PR" tags for milestones achieved within 7 days.
   - **Form Mastery & Error Shift:** Average computer-vision score per exercise. Once $\ge 3$ sessions are logged, compares the earlier half against the recent half to highlight eliminated flaws. Shows friendly diagnostic prompt if $<3$ sessions.
   - **Projected Goal Date & Safety Velocity Check:** Extrapolates linear target completion date ONLY when $\ge 3$ weigh-ins span $\ge 7$ days. Automatically flags an alert if weekly weight change exceeds 1.0% of bodyweight to ensure healthy pacing.
   - **Calorie Estimation via Compendium METs (`src/lib/progress/metValues.ts`):** Standard scientific MET values (Squat 5.5, Push-Up 4.5, Lunge 5.0, Plank 3.8, Curl 3.8) computing calories as $\text{MET} \times \text{Weight (kg)} \times \text{Hours}$, explicitly labeled as "Estimated".
   - **Rule-Based Plain-Language Insights:** 3 to 5 deterministic, friendly coaching observations based on actual user consistency, form, PRs, and body trends (zero AI dependency).

4. **Progress Page Polish (`/progress`)**
   - **Time Range Selector:** Seamless tabs (`7 Days`, `30 Days`, `Whole Program`) filtering metrics on demand.
   - **Educational Info Modal (`HowIsThisCalculatedModal.tsx`):** Explains all formulas and biometric rationale in plain, accessible language.
   - **Data Quality Diagnostics:** Informative states on charts explaining exactly how many sessions or weigh-ins are needed to unlock projections and trend lines.

5. **Automated Verification & Testing**
   - 86 Vitest tests passing across 5 test suites (added 16 tests in `tests/realMetrics.test.ts`).
   - TypeScript (`npx tsc --noEmit`): 0 errors.
   - ESLint (`npm run lint`): 0 warnings or errors.
   - Production build (`npm run build`): All 11 static and dynamic routes compiled and optimized cleanly.

### Step 6 – 3D Character with Muscle Highlight
- 3D body model highlighting muscles worked.

### Step 7 – Video Upload Comparison
- Upload workout video for form analysis.
- Side-by-side comparison with ideal form.

### Step 8 – Warm-up/Cool-down + Calorie/Water Tracking
- Guided warm-up and cool-down routines.
- Daily calorie and water intake tracking.

### Step 9 – PWA + Weekly PDF
- Progressive Web App for offline use.
- Weekly progress report as downloadable PDF.

---

## Data Model (Prisma)

### User
| Field          | Type    |
|----------------|---------|
| id             | Int PK  |
| name           | String  |
| age            | Int     |
| gender         | String  |
| heightCm       | Float   |
| weightKg       | Float   |
| goal           | String  |
| experience     | String  |
| daysPerWeek    | Int     |
| createdAt      | DateTime|

### WorkoutDay
| Field          | Type    |
|----------------|---------|
| id             | Int PK  |
| userId         | Int FK  |
| dayNumber      | Int     |
| workoutType    | String  |
| isRest         | Boolean |

### DayExercise
| Field          | Type    |
|----------------|---------|
| id             | Int PK  |
| workoutDayId   | Int FK  |
| exerciseName   | String  |
| targetMuscles  | String  |
| sets           | Int     |
| reps           | Int     |
| durationSecs   | Int?    |
| restSeconds    | Int     |
| formTrackable  | Boolean |
| orderIndex     | Int     |

### WorkoutLog
| Field          | Type     |
|----------------|----------|
| id             | Int PK   |
| userId         | Int FK   |
| userName       | String   |
| dayNumber      | Int      |
| exercise       | String   |
| setNumber      | Int      |
| reps           | Int      |
| durationSeconds| Int?     |
| formScore      | Float?   |
| mistakes       | String   |
| restSeconds    | Int      |
| mode           | String   |
| completedAt    | DateTime |

### DietPlan
| Field          | Type     |
|----------------|----------|
| id             | Int PK   |
| userId         | Int FK   |
| budget         | Float    |
| dietType       | String   |
| excludedFoods  | String?  |
| targetCalories | Int      |
| targetProtein  | Float    |
| totalCost      | Float    |
| totalCalories  | Int      |
| totalProtein   | Float    |
| mealsJson      | String   |
| createdAt      | DateTime |

---

## Log File Format
`data/workout_logs.json` – regenerated from DB after every write. Array of log objects matching the WorkoutLog schema.

---

## Database & Log File Locations
- **Database:** `prisma/dev.db` (SQLite)
- **Workout logs JSON:** `data/workout_logs.json`
