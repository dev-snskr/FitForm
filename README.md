# FitForm - AI Gym & Personalized Workout App

FitForm is a modern, responsive web application for personalized fitness planning, automated progressive overload schedules, and workout telemetry. Built for a college engineering project.

---

## Tech Stack
- **Framework:** [Next.js 14](https://nextjs.org/) (App Router) + TypeScript
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) with custom dark glassmorphic UI
- **Database:** SQLite (file-based, zero cloud accounts/APIs required) via [Prisma ORM](https://www.prisma.io/)
- **Icons:** [Lucide React](https://lucide.dev/)

---

## Where the Database and Log Files Live

- **SQLite Database File:** `prisma/dev.db`
  - Stores all user profiles, customized 30-day schedules, and logged workout records.
  - Zero external accounts, connection strings, or cloud services needed.
- **Workout Logs JSON File:** `data/workout_logs.json`
  - Automatically regenerated from SQLite after every single workout log write.
  - Keeps the database as the single source of truth while ensuring easy inspection and JSON portability.

---

## How to Install & Run

### 1. Prerequisites
- **Node.js** (v18.17+ or LTS v20+) installed on your machine.
- Verify installation by opening a terminal and running:
  ```bash
  node -v
  npm -v
  ```

### 2. Install Dependencies
Open a terminal in the project directory (`c:\Users\Sanskar\Desktop\cep2`) and run:
```bash
npm install
```
*(All dependency versions are pinned so it works reliably on fresh machines, and `npx prisma generate` is triggered automatically upon install).*

### 3. Initialize / Sync the Local Database
Run:
```bash
npx prisma db push
```
This generates the SQLite file `prisma/dev.db` and syncs the schema.

### 4. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## Project Folder Structure

```
cep2/
├── data/
│   └── workout_logs.json       # Auto-synced workout logs in JSON format
├── prisma/
│   ├── schema.prisma           # Prisma database schema definition
│   └── dev.db                  # Local SQLite database file
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── logs/route.ts   # Log creation, list, JSON & CSV export API
│   │   │   ├── plan/route.ts   # 30-day plan & single day retrieval API
│   │   │   └── users/route.ts  # Profile creation & listing API
│   │   ├── diet/
│   │   │   └── page.tsx        # Diet-by-budget page placeholder (Step 2)
│   │   ├── logs/
│   │   │   └── page.tsx        # Workout logs telemetry table & export actions
│   │   ├── onboarding/
│   │   │   └── page.tsx        # Physical metrics & fitness goal onboarding form
│   │   ├── plan/
│   │   │   ├── [day]/page.tsx  # Detailed single day workout view
│   │   │   └── page.tsx        # Interactive 30-day program grid
│   │   ├── globals.css         # Dark theme & glassmorphic styles
│   │   ├── layout.tsx          # App root layout with ambient gradients & navbar
│   │   └── page.tsx            # Gateway redirect (routes returning users to /plan)
│   ├── components/
│   │   └── Navbar.tsx          # Responsive navbar with profile switcher
│   └── lib/
│       ├── exerciseData.ts     # Central registry of form-trackable and extra exercises
│       ├── planGenerator.ts    # Deterministic 30-day template engine
│       ├── prisma.ts           # Prisma client singleton instance
│       ├── profileStorage.ts   # Browser localStorage session memory
│       ├── syncLogs.ts         # Single-source-of-truth JSON file sync helper
│       └── validation.ts       # Strict profile input validation & error messages
├── package.json                # Pinned dependencies & run scripts
├── PROJECT_SPEC.md             # Complete master specification and roadmap
└── README.md                   # This project guide
```

---

## Build Order & Roadmap
- [x] **Step 1 (Complete):** Core app, onboarding validation, 30-day deterministic plan generation, interactive plan view, workout logs with JSON/CSV export, dev test logger, auto-synced `data/workout_logs.json`, and multi-profile switcher.
- [ ] **Step 2:** Diet-by-budget recommendation page.
- [ ] **Step 3:** Live camera form checking with MediaPipe Pose (rep counting + form scoring).
- [ ] **Step 4:** Voice corrections + audio feedback + rest countdown timer.
- [ ] **Step 5:** Streaks, achievement badges, and visual progress dashboard.
- [ ] **Step 6:** 3D animated character with muscle highlights.
- [ ] **Step 7:** Side-by-side video upload analysis and comparison.
- [ ] **Step 8:** Guided warm-up/cool-down routines + calorie/water tracking.
- [ ] **Step 9:** Light/Dark theme toggle + PWA + weekly PDF export.
