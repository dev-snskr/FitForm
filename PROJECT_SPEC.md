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

### 2. Animated Background Layer
- Component: [`src/components/AnimatedBackground.tsx`](file:///c:/Users/Sanskar/Desktop/cep2/src/components/AnimatedBackground.tsx)
- Renders:
  - 3 large, slowly drifting blurred gradient blobs (hardware-accelerated CSS keyframes).
  - Subtle floating particles via HTML5 Canvas (capped at 24 particles).
  - Theme-aware palette (deep blue/purple/cyan in dark mode; soft pastel lavender/sky/rose in light mode).
- Performance & Accessibility:
  - Automatically pauses when the browser tab is hidden (`document.hidden` event listener).
  - Respects system accessibility `prefers-reduced-motion`: pauses movement and displays a static soft gradient.
  - Fixed behind content with `pointer-events-none -z-10`, never obstructing clicks or interfering with content.

#### How to Disable or Customize the Background on Specific Pages (e.g. Camera in Step 3)
The `<AnimatedBackground />` component exposes props:
- `enabled={false}`: Completely turns off the background (ideal for full-screen camera form checking).
- `showParticles={false}`: Keeps the soft gradient blobs but disables canvas particle computations.
- Custom usage example:
  ```tsx
  import AnimatedBackground from '@/components/AnimatedBackground';

  export default function CameraWorkoutPage() {
    return (
      <>
        {/* Turn off background during live camera tracking to save CPU/GPU */}
        <AnimatedBackground enabled={false} />
        <div>... camera UI ...</div>
      </>
    );
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

3. **Plan page (`/plan`)**
   - Grid of Day 1–30 cards. Each shows day number, workout type or "Rest day", status (not started/completed from logs).
   - Click → `/plan/[day]` with exercises, sets, reps, rest. "Start workout" button disabled, labelled "Coming in Step 3".

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

### Step 3 – Live Camera Form Checking
- MediaPipe Pose integration for real-time form analysis.
- Rep counting + form score for the 5 primary exercises.

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
