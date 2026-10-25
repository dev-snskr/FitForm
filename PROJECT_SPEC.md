# FitForm – AI Gym Web App – Project Specification

## Tech Stack
- **Framework:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind CSS (glassmorphism design)
- **Database:** SQLite via Prisma ORM (file-based, no cloud services)
- **No external accounts, API keys, or cloud services**

## Design Language
Modern glassmorphism: dark gradient background, frosted translucent cards with backdrop-blur, soft borders, subtle glow, rounded corners, smooth hover/transition effects, clean readable font. Responsive (mobile + desktop).

---

## Build Order & Steps

### Step 1 – Core App (THIS STEP)
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
   - Exercise data in a single separate file.

3. **Plan page (`/plan`)**
   - Grid of Day 1–30 cards. Each shows day number, workout type or "Rest day", status (not started/completed from logs).
   - Click → `/plan/[day]` with exercises, sets, reps, rest. "Start workout" button disabled, labelled "Coming in Step 3".

4. **Navigation bar** on every page except onboarding: Workout, Diet, Logs. Highlights current page.
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

### Step 2 – Diet by Budget Page
- Diet recommendation page based on user budget.

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

### Step 9 – Dark/Light Toggle + PWA + Weekly PDF
- Theme toggle (dark/light mode).
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

---

## Log File Format
`data/workout_logs.json` – regenerated from DB after every write. Array of log objects matching the WorkoutLog schema.

---

## Folder Structure
```
src/
  app/
    layout.tsx          – root layout with dark gradient background
    page.tsx            – redirect logic (to /onboarding or /plan)
    onboarding/page.tsx – onboarding form
    plan/page.tsx       – 30-day plan grid
    plan/[day]/page.tsx – single day detail
    diet/page.tsx       – placeholder
    logs/page.tsx       – logs table + exports
    api/
      users/route.ts    – create/list users
      plan/route.ts     – get plan for user
      logs/route.ts     – create/list/export logs
  components/
    Navbar.tsx          – navigation bar
    GlassCard.tsx       – reusable glass card
    ...
  lib/
    prisma.ts           – Prisma client singleton
    planGenerator.ts    – 30-day plan generation
    exerciseData.ts     – exercise definitions (separate file)
    syncLogs.ts         – sync logs to JSON file
    validation.ts       – form validation
data/
  workout_logs.json     – synced log file
prisma/
  schema.prisma         – database schema
  dev.db                – SQLite database file
```

---

## Database & Log File Locations
- **Database:** `prisma/dev.db` (SQLite)
- **Workout logs JSON:** `data/workout_logs.json`
