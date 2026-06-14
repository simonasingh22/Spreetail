# Splitwise Clone (Spreetail Internship Assignment)

A peer-to-peer expense tracking and debt settlement application that mimics the core features of Splitwise. It supports multiple splitting options (Equal, Unequal, Percentage, Shares), dynamic debt minimization, real-time comment chat on individual expenses, and live balance updates.

**Live Demo URL**: [Pending Deployment]

---

## 1. Tech Stack

| Component | Technology | Details |
| :--- | :--- | :--- |
| **Backend** | Node.js + Express | REST APIs + Socket.io integration |
| **Database** | PostgreSQL | Relational database modeling |
| **ORM** | Prisma | Schema mapping and queries |
| **Frontend** | React (Vite + TS) | Client application with Tailwind CSS |
| **Real-time** | Socket.io | Bidirectional communication for chat |
| **Auth** | JWT | Access (15m in memory) + Refresh (7d in httpOnly cookie) |
| **State** | Zustand + React Query | Client-state and Server-state split |
| **Deployment**| Railway & Vercel | Production hosts |

---

## 2. Prerequisites

- **Node.js**: `v18.x` or higher
- **PostgreSQL**: Local running instance or remote connection URI

---

## 3. Environment Variables Setup

### Backend (`backend/.env`)

```env
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/splitwise_dev
JWT_ACCESS_SECRET=<64-char-hex-key>
JWT_REFRESH_SECRET=<64-char-hex-key>
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
BCRYPT_SALT_ROUNDS=12
```

> **Note**: You can generate secure random keys using:
> `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

---

## 4. Local Setup Steps

Follow these steps to run the project locally:

### 4.1 Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment configuration and configure values:
   ```bash
   cp .env.example .env
   ```
4. Perform database migration initialization:
   ```bash
   npx prisma migrate dev --name init
   ```
5. Seed the database with test data:
   ```bash
   npm run db:seed
   ```
6. Run the local Express server:
   ```bash
   npm run dev
   ```

### 4.2 Frontend Setup

1. Open a new terminal window and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```
4. Run the local React Vite development server:
   ```bash
   npm run dev
   ```

---

## 5. Collaboration Context

- **AI Tool Used**: Claude (Anthropic)
- **Single Source of Truth**: `AI_CONTEXT.md`
- **Execution Blueprint**: `BUILD_PLAN.md`
