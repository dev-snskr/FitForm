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

### Step 4 – Voice Corrections + Rest Timer
- Audio feedback for form mistakes.
- Countdown rest timer between sets.

### Step 5 – Streaks/Badges + Progress Dashboard
- Workout streak tracking, achievement badges.
- Visual progress dashboard with charts.

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
