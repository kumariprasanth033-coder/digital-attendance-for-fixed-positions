# Digital Attendance for Fixed Positions

> **Smart, Simple and Position-Based Classroom Attendance**
> 
> An institutional-grade web application designed for modern universities and colleges where classrooms resemble cinema/theatre seating arrangements. Students are assigned permanent, fixed coordinates (Row × Column), allowing faculty to conduct roll calls in seconds, visualize seating allocations by gender, monitor live percentage turnouts, and export official CSV reports backed by a persistent database with Supabase PostgreSQL and Row Level Security.

---

## 1. Project Overview

Traditional roll calls take 15–20 minutes and paper attendance sheets invite proxy signatures. **Digital Attendance for Fixed Positions** transforms this experience by establishing fixed physical positions for each student within a customizable cinema/theatre matrix (e.g. 4 rows × 4 columns = 16 positions, 6 × 8 = 48 positions, etc.). 

Faculty can:
- Define tiered classroom dimensions with dynamic position calculation.
- Permanently bind students to explicit seats with their Name, Roll Number, Branch, and Gender.
- Filter the matrix dynamically into **Boys Side**, **Girls Side**, or **All Students** without displacing grid geometry.
- Take attendance with 1-click toggles and watch live attendance percentages update in real-time.
- Submit sessions securely with confirmation safeguards to prevent accidental submission.
- Download certified, formatted CSV spreadsheets with dynamic filenames.
- Provide administrators with a central governance console to audit faculty usage and campus-wide compliance.

---

## 2. Technology Stack

### Frontend
- **React 19** & **Vite**: Ultra-fast component lifecycle and single-page routing.
- **TypeScript**: Strict compile-time safety across database schemas, attendance records, and roles.
- **Tailwind CSS 4**: Modern utility-first styling with typography pairings (`Cabinet Grotesk` display headers, `Plus Jakarta Sans` body, `JetBrains Mono` tabular metrics).
- **React Router 7**: Declarative role-protected routing for Faculty and Admin portals.
- **Lucide React**: Clean, accessible iconography.

### Database & Authentication
- **Supabase PostgreSQL**: Persistent relational storage with foreign key constraints, unique indexes, and triggers.
- **Supabase Authentication**: Secure user session tokens, password hashing, and role claims.
- **Row Level Security (RLS)**: Enforces access control ensuring faculty only see their own sections while administrators retain systemic oversight.

### Backend APIs & Architecture
- **PHP 8+ REST Structure** (`backend/`): Clean MVC controllers, PDO database layer, and models (`Classroom.php`, `Attendance.php`).
- **Resilient Dual Storage**: Native Supabase client with immediate live connectivity, paired with a zero-friction persistent preview engine so all features, CRUD actions, CSV downloads, and 23 tests work right out of the box!

---

## 3. Folder Structure

```
digital-attendance/
├── .env.example                     # Environment variables template
├── index.html                       # Application HTML entry point & font links
├── metadata.json                    # Project descriptor & capabilities
├── package.json                     # NPM packages & build scripts
├── tsconfig.json                    # TypeScript compiler options
├── vite.config.ts                   # Vite configuration
│
├── database/
│   ├── schema.sql                   # 6 Supabase tables, indexes, triggers & RLS policies
│   └── seed.sql                     # Realistic demo data (AI & DS - 4x4 matrix, 16 students)
│
├── backend/                         # Clean PHP 8+ REST API structure
│   ├── config/
│   │   └── Database.php             # PDO database connection
│   ├── controllers/
│   │   ├── ClassroomController.php  # Classroom CRUD & validation
│   │   └── AttendanceController.php # Batch attendance submission & summary
│   ├── models/
│   │   ├── Classroom.php            # Classroom model queries
│   │   └── Attendance.php           # Session and record transactions
│   └── index.php                    # REST router endpoint
│
└── src/
    ├── assets/images/               # High-fidelity visual assets (lecture hall & avatars)
    ├── components/
    │   ├── charts/
    │   │   ├── AttendanceDoughnut.tsx   # SVG Present vs Absent doughnut
    │   │   └── AttendanceBarChart.tsx   # Responsive session turnout bars
    │   ├── classroom/
    │   │   ├── CreateClassroomModal.tsx # Row × Col classroom builder
    │   │   ├── SeatCard.tsx             # Theatre seat box with states & actions
    │   │   ├── SeatingMatrix.tsx        # Cinema matrix with stage & boys/girls view
    │   │   └── StudentFormModal.tsx     # Fixed position assignment & editing
    │   └── common/
    │       ├── Navbar.tsx               # Top Bar Contract with quick role switcher
    │       ├── ProtectedRoute.tsx       # Role-based route guard
    │       └── SupabaseConfigModal.tsx  # In-app Supabase connection modal
    │
    ├── context/
    │   └── AuthContext.tsx          # Real user session, role, login & registration
    ├── lib/
    │   └── supabase.ts              # Supabase client setup & runtime config
    ├── pages/
    │   ├── LandingPage.tsx          # Public landing page with hero, how-it-works & Bento
    │   ├── LoginPage.tsx            # Role-tabbed login with quick test credentials
    │   ├── RegisterPage.tsx         # Account registration with role selection
    │   ├── faculty/
    │   │   ├── FacultyDashboard.tsx     # Metrics, quick actions & session charts
    │   │   ├── ClassroomsPage.tsx       # Classroom list & deletion safeguards
    │   │   ├── ClassroomDetailPage.tsx  # Seating matrix, student assignment & boys/girls
    │   │   ├── TakeAttendancePage.tsx   # Interactive roll call & live % statistics
    │   │   ├── AttendanceHistoryPage.tsx# Audit table, session detail modal & CSV
    │   │   ├── ReportsPage.tsx          # Aggregate student report & CSV export
    │   │   └── ProfilePage.tsx          # Profile update, password change & delete
    │   └── admin/
    │       ├── AdminDashboard.tsx       # Campus statistics & system activity log
    │       ├── FacultyManagementPage.tsx# Faculty directory, search & account status
    │       ├── AdminClassroomsPage.tsx  # University-wide classroom inspection
    │       ├── AdminAnalyticsPage.tsx   # Comparative turnout metrics
    │       └── AdminProfilePage.tsx     # System administrator profile
    │
    ├── services/
    │   └── api.ts                   # Unified repository layer (Supabase + local persistent)
    ├── types/
    │   └── index.ts                 # TypeScript interfaces
    ├── App.tsx                      # Root routes
    ├── index.css                    # Tailwind CSS 4 & typography rules
    └── main.tsx                     # React DOM entry point
```

---

## 4. Supabase Setup Guide

### Step 1: Create a Supabase Project
1. Log into your [Supabase Dashboard](https://supabase.com).
2. Click **New Project**, choose a project name (e.g. `digital-attendance`), and set a secure database password.

### Step 2: Execute Schema & RLS
1. In the Supabase project dashboard, navigate to the **SQL Editor**.
2. Open `database/schema.sql` from this repository.
3. Paste the contents into the SQL Editor and click **Run**.
4. This creates:
   - `profiles` table (linked to `auth.users`)
   - `classrooms` table
   - `students` table (with position uniqueness constraints)
   - `attendance_sessions` table
   - `attendance_records` table
   - `activity_logs` table
   - Indexes and Row Level Security (RLS) policies

### Step 3: Seed Demonstration Data (Optional)
1. In the SQL Editor, paste the contents of `database/seed.sql` and run.
2. This creates the sample classroom **"AI & DS - Section A"** (4 rows × 4 columns = 16 students) with past attendance sessions.

### Step 4: Configure Environment Variables
Copy `.env.example` to `.env.local`:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```
*Alternatively, you can click the **"Supabase Config"** button in the app's top navigation bar to paste your credentials directly into the live UI!*

---

## 5. Quick Test & Demonstration Accounts

The application includes built-in quick test accounts so you can test all features immediately:

| Role | Email | Password | Name |
| :--- | :--- | :--- | :--- |
| **Faculty** | `ramesh.faculty@university.edu` | `password123` | Dr. Ramesh Kumar (AI & DS) |
| **Admin** | `admin.portal@university.edu` | `password123` | Admin Dean Office |

*Use the quick role switcher in the top navigation bar or the pre-fill buttons on the Sign In page to toggle between Faculty and Admin modes instantly.*

---

## 6. Verification Checklist

The application satisfies all 23 verification test cases:

- [x] **Test 1**: Create faculty account via `/register`.
- [x] **Test 2**: Login as faculty via `/login`.
- [x] **Test 3**: Create classroom with custom rows and columns.
- [x] **Test 4**: Verify classroom persists across page refresh.
- [x] **Test 5**: Assign students to fixed seats (row, column).
- [x] **Test 6**: Verify fixed positions remain stable and never shift.
- [x] **Test 7**: Open Boys Side view (highlights male students).
- [x] **Test 8**: Open Girls Side view (highlights female students).
- [x] **Test 9**: Start attendance session from classroom page.
- [x] **Test 10**: Mark students present / absent with 1-click toggles.
- [x] **Test 11**: Verify live percentage calculations update on every click.
- [x] **Test 12**: Submit attendance with safety confirmation dialog.
- [x] **Test 13**: Refresh page and confirm attendance is preserved.
- [x] **Test 14**: Verify attendance remains in persistent store.
- [x] **Test 15**: Open attendance history and filter by classroom/date.
- [x] **Test 16**: Download certified CSV report with dynamic filename.
- [x] **Test 17**: Sign out of account.
- [x] **Test 18**: Sign back in with credentials.
- [x] **Test 19**: Confirm all classrooms and attendance records remain available.
- [x] **Test 20**: Login as administrator.
- [x] **Test 21**: Verify admin dashboard statistics and charts.
- [x] **Test 22**: Verify admin faculty management, search, and detail modal.
- [x] **Test 23**: Verify unauthorized faculty cannot access `/admin/*` routes.

---

## 7. Local Development & Build Commands

### Frontend
```bash
# Install dependencies
npm install

# Start Vite development server on port 3000
npm run dev

# Build production bundle
npm run build
```

### PHP Backend (Optional)
If running a local PHP server for the REST API:
```bash
cd backend
php -S localhost:8000
```

---

## 8. License

Licensed under the Apache-2.0 License.
