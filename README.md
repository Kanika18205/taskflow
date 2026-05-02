# ⚡ TaskFlow — Team Task Manager

A full-stack team task management app with role-based access control, project management, and real-time dashboards.

![TaskFlow](https://img.shields.io/badge/Stack-React%20%2B%20Node.js%20%2B%20SQLite-6366f1)
![Railway](https://img.shields.io/badge/Deploy-Railway-0B0D0E)

---

## Features

- **Authentication** — JWT-based signup/login with role selection (Admin/Member)
- **Projects** — Create, edit, delete projects with color coding and status tracking
- **Kanban Board** — Visual task board by status (Todo → In Progress → Review → Done)
- **Task Management** — Full CRUD with priority, assignee, due dates, and comments
- **Dashboard** — Real-time stats: task counts, overdue alerts, progress tracking
- **Role-Based Access** — Global Admin/Member roles + per-project Admin/Member roles
- **Team Management** — Invite members by email, manage project roles
- **User Admin Panel** — Admin-only: view all users, toggle roles, delete users

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Database | SQLite via better-sqlite3 |
| Auth | JWT + bcrypt |
| Deploy | Railway |

---

## Project Structure

```
taskflow/
├── backend/
│   ├── config/
│   │   └── database.js        # SQLite setup + schema
│   ├── middleware/
│   │   └── auth.js            # JWT auth + RBAC
│   ├── routes/
│   │   ├── auth.js            # POST /signup, /login, GET /me
│   │   ├── projects.js        # CRUD + member management
│   │   ├── tasks.js           # CRUD + comments
│   │   └── dashboard.js       # Stats + admin user management
│   ├── data/                  # SQLite DB file (auto-created)
│   ├── server.js              # Express app entry
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── SignupPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── ProjectsPage.jsx
│   │   │   ├── ProjectDetailPage.jsx
│   │   │   ├── TasksPage.jsx
│   │   │   ├── TaskDetailPage.jsx
│   │   │   ├── UsersPage.jsx
│   │   │   └── ProfilePage.jsx
│   │   ├── components/
│   │   │   └── Layout.jsx
│   │   ├── utils/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── railway.toml
├── nixpacks.toml
└── README.md
```

---

## Local Development

### Prerequisites
- Node.js 18+
- npm

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd taskflow

# Install backend deps
cd backend && npm install

# Install frontend deps
cd ../frontend && npm install
```

### 2. Configure Backend

```bash
cd backend
cp .env.example .env
# Edit .env — change JWT_SECRET to a random string!
```

### 3. Run Development Servers

```bash
# Terminal 1 — Backend (port 5000)
cd backend && npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend && npm run dev
```

Open http://localhost:5173

---

## Deploy to Railway

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin "https://github.com/Kanika18205/taskflow.git"
git push -u origin main
```

### Step 2: Create Railway Project
1. Go to [railway.app](https://railway.app) → New Project
2. **Deploy from GitHub repo** → select your repo
3. Railway auto-detects `nixpacks.toml`

### Step 3: Set Environment Variables
In Railway dashboard → your service → Variables, add:

```
NODE_ENV=production
JWT_SECRET=your_super_secret_random_string_here_at_least_32_chars
PORT=5000
```

### Step 4: Get Your URL
- Railway → Settings → Networking → Generate Domain
- Your app will be live at `https://your-app.railway.app`

### Step 5: (Optional) Custom Domain
Railway → Settings → Custom Domain → add your domain

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List accessible projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Get project + members |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| POST | `/api/projects/:id/members` | Add member by email |
| DELETE | `/api/projects/:id/members/:uid` | Remove member |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List tasks (with filters) |
| GET | `/api/tasks/my` | My assigned tasks |
| GET | `/api/tasks/:id` | Task details + comments |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| POST | `/api/tasks/:id/comments` | Add comment |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Aggregated stats |
| GET | `/api/dashboard/users` | All users (admin only) |
| PUT | `/api/dashboard/users/:id/role` | Change role (admin only) |
| DELETE | `/api/dashboard/users/:id` | Delete user (admin only) |

---

## Role System

### Global Roles
- **Admin** — Full access to all projects, tasks, and user management
- **Member** — Access only to projects they're members of

### Project Roles
- **Admin** — Can edit project, manage members, delete tasks
- **Member** — Can create tasks, add comments, update task status

---

## Demo Accounts

After signing up, you can create:
- One **Admin** account (select "Admin" role on signup)
- Multiple **Member** accounts

Use the **Demo** buttons on the login page if you set up seed data.

---

