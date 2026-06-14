# 💸 Spreetail — Premium Peer-to-Peer Expense Ledger
### Developed by **Simona Singh**

Spreetail is a premium, production-grade peer-to-peer expense tracking and debt settlement application modeled after the core features of Splitwise. Built with a robust client-server monorepo architecture, this application supports dynamic multi-mode splitting (Equal, Unequal, Percentages, Shares), intelligent **Greedy Debt Minimization** to optimize transactions, real-time WebSocket comment threads per expense, and instant or deferred payment settlements badged with multiple payment methods (Venmo, UPI, Bank Transfer, PayPal, Cash, Credit Card). Designed with a striking, custom editorial off-black and champagne-gold aesthetic, Spreetail offers a highly intuitive split-screen dashboard workspace that allows roommates, travel companions, and event organizers to easily balance and settle debts.

---

## 🔗 Live Deployments

- **Live Demo (Client)**: [https://spreetail.vercel.app](https://spreetail.vercel.app)
- **Live API (Server)**: [https://spreetail-backend.up.railway.app](https://spreetail-backend.up.railway.app)

---

## 🤖 AI Collaboration Details

- **AI Tool Used**: Claude (Anthropic) via [claude.ai](https://claude.ai)
- **Collaboration Role**: Co-pilot developer assisting in architectural layout planning, database schemas, TypeScript validations, and Tailwind UI theme designs.

---

## 🛠️ Tech Stack Reference

| Layer | Technologies | Role / Feature |
| :--- | :--- | :--- |
| **Frontend** | React (Vite + TypeScript) | Client-side application, Tailwind CSS, Zustand, React Query |
| **Backend** | Node.js + Express | REST APIs, Socket.io integration |
| **Database** | PostgreSQL | Relational storage for users, groups, splits, settlements, and messages |
| **ORM** | Prisma | Schema mapping and database migrations |
| **Auth** | JWT | Access (in-memory) + Refresh (secure httpOnly cookie) |

---

## ⚡ Local Setup Instructions

Follow these step-by-step instructions to clone, install, and run the project locally.

### 1. Clone the Repository
```bash
git clone https://github.com/Sarthak3131/Spreetail.git
cd Spreetail
```

### 2. Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies (in a new terminal tab/session)
cd ../frontend
npm install
```

### 3. Setup Environment Variables
Configure your environment files based on the templates:

- **Backend (`backend/.env`)**:
  ```env
  PORT=3000
  DATABASE_URL="postgresql://<user>:<password>@localhost:5433/spreetail"
  JWT_ACCESS_SECRET="generate-64-character-hex-string"
  JWT_REFRESH_SECRET="generate-64-character-hex-string"
  FRONTEND_URL="http://localhost:5173"
  NODE_ENV="development"
  BCRYPT_SALT_ROUNDS=12
  ```

- **Frontend (`frontend/.env`)**:
  ```env
  VITE_API_URL="http://localhost:3000"
  VITE_SOCKET_URL="http://localhost:3000"
  ```

### 4. Database Schema Migration & Seed
Initialize the database and insert test mock data (Alice, Bob, Carol, Dave, Goa Trip):
```bash
cd ../backend
npx prisma migrate dev
npm run db:seed
```

### 5. Run the Application
Start the development servers:
```bash
# Start backend server (runs on port 3000)
cd ../backend
npm run dev

# Start frontend server (runs on port 5173)
cd ../frontend
npm run dev
```

---

## ⚙️ Environment Variables Reference

| Variable | Scope | Description |
| :--- | :--- | :--- |
| `PORT` | Backend | Port number for Express server to bind to (e.g., `3000`) |
| `DATABASE_URL` | Backend | Connection string to PostgreSQL instance |
| `JWT_ACCESS_SECRET`| Backend | Signature key for short-lived access JWTs |
| `JWT_REFRESH_SECRET`| Backend | Signature key for long-lived session refresh tokens |
| `FRONTEND_URL` | Backend | Target origin for CORS validation checks |
| `NODE_ENV` | Backend | Current environment tier (`development` or `production`) |
| `VITE_API_URL` | Frontend | Target API server base URL for HTTP endpoints |
| `VITE_SOCKET_URL` | Frontend | Target API server base URL for WebSocket gateway |

---

## 🏛️ Key Architectural Decisions

1. **Greedy Debt Minimization**: Obligation balances are solved dynamically in-memory on dashboard loads. Debtors are queued against creditors to resolve group balances in the minimum transactions ($O(N \log N)$ complexity).
2. **Database Cents Safe Accuracy**: Relies on Prisma-mapped `Decimal` datatypes for split shares and expense amounts instead of binary floats, preventing cumulative fraction arithmetic errors.
3. **Automated Client Refresh Token Rotation**: Implemented database-backed token validation mapped to HttpOnly browser cookies. Old refresh tokens are rotated and destroyed upon access refreshes, preventing replay attacks.
4. **Formless Component Controls**: Adheres to modern React design patterns by utilizing Zustand and click triggers for forms, preventing browser refresh state losses.
