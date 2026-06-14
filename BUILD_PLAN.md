# Build Plan: Splitwise Clone

This document details the step-by-step implementation plan for the Splitwise Clone internship assignment. The project is structured as a monorepo containing two independent, self-contained packages: `backend` and `frontend`.

---

## 1. Product Research & Architectural Design

### 1.1 Core Architecture
The application uses a split client-server architecture:
- **Backend**: Node.js, Express, Socket.io for real-time messaging, Prisma ORM for PostgreSQL.
- **Frontend**: React, Vite, TypeScript, Tailwind CSS, Zustand (client state), React Query (server state).
- **Communication Protocols**:
  - **HTTP/REST**: Handles standard CRUD operations (auth, groups, expense creations, settlements, history retrieval, message deletion).
  - **WebSocket (Socket.io)**: Handles real-time message broadcasting and real-time list/balance updates for active group screens.

### 1.2 Data Flow & State Synchronization
To maintain a single source of truth and optimize performance:
- Server calculations are dynamic. Group balances are calculated in memory at request time.
- React Query controls server-side cached state on the frontend, ensuring data is refetched upon mutate operations or socket broadcast notifications.
- Zustand handles only client-side transient states: user credentials (JWT access tokens), active Socket.io client instance, and UI toggles.

---

## 2. Technical Decisions & Trade-offs

| Choice | Selected Option | Rationale / Trade-off |
| :--- | :--- | :--- |
| **Monorepo Style** | Separate directories (no workspaces) | Standard workspaces introduce dependency hoisting complexity that often breaks build steps on Railway and Vercel. Self-contained packages are simpler to deploy. |
| **State Management** | React Query + Zustand | Prevents duplication of server data in client state. React Query provides caching/refetching; Zustand handles auth sessions and UI variables. |
| **WebSocket vs REST** | Hybrid | Real-time chat messages and notifications are transmitted via WebSocket. Mutations (e.g. deleting messages) use REST to ensure delivery reliability during network drops. |
| **Password Hashing** | Bcrypt (12 rounds) | Bcrypt is highly stable and cross-platform. Argon2 requires native compiler binaries, which frequently break during automated cloud builds (like Railway). |
| **Refresh Token Storage** | Database-backed + httpOnly cookie | Purely stateless JWTs cannot be revoked upon logout. Storing refresh tokens in a database-backed table allows immediate revocation while using httpOnly cookies protects against XSS theft. |
| **Input Validation** | Zod | Provides runtime validation with automatic TypeScript type inference, eliminating manual validation middleware overhead. |

---

## 3. Step-by-Step Build Plan

### Phase 1: Environment & Scaffold Generation
- [ ] Initialize git repository in root.
- [ ] Create `backend` folder structure, initialize npm project, configure TypeScript, and write backend `package.json`.
- [ ] Create `frontend` folder structure, initialize Vite React app with TypeScript, configure Tailwind CSS, and write frontend `package.json`.
- [ ] Set up `.env` and `.env.example` in both folders.
- [ ] Write `vercel.json` in `frontend/` and tsconfig files in both packages.

### Phase 2: Database Schema & Migration
- [ ] Create `backend/prisma/schema.prisma` with defined PostgreSQL schemas.
- [ ] Initialize Prisma client and run initial migrations (`npx prisma migrate dev`).
- [ ] Write the seeding script `backend/prisma/seed.ts` with the 4 test users, Goa trip, and Flat 4B groups.
- [ ] Execute `npx prisma db seed` to verify migrations and seed integrity.

### Phase 3: Backend Authentication & Middleware
- [ ] Implement utility classes for JWT signing/verification and bcrypt password hashing.
- [ ] Write Express JSON error wrapper and path validator middleware.
- [ ] Create Zod schemas in `validators/auth.validators.ts`.
- [ ] Write `auth.controller.ts` and `auth.routes.ts` (Register, Login, Refresh, Logout).
- [ ] Verify auth endpoints locally using a script or manual testing tools.

### Phase 4: Backend Group & Member Management
- [ ] Implement Zod validation schemas for groups and members.
- [ ] Implement `group.controller.ts` and `group.routes.ts` (CRUD groups, add member by email, soft-remove member).
- [ ] Add route-level and controller-level group membership validation rules.

### Phase 5: Dynamic Balance Calculations & Settlements
- [ ] Implement the **greedy debt simplification** algorithm in `services/balance.service.ts`:
  1. Calculate net balances (paid amount minus owed amount) for all active group members.
  2. Separate creditors (net balance > 0) and debtors (net balance < 0).
  3. Sort both lists in descending order of absolute values.
  4. Greedily match the largest debtor with the largest creditor, record a simplified payment, adjust their net balances, and recurse until all balances are settled (at or near 0).
- [ ] Create endpoints for `GET /api/groups/:groupId/balances` to return simplified debts, raw debts, and individual user summaries.
- [ ] Implement settlement CRUD operations under `settlement.controller.ts` and `settlement.routes.ts` (record manual payment, delete settlement).

### Phase 6: Backend Expense Lifecycle & Chat
- [ ] Implement expense validation schemas (supporting unequal, percentage, share, and equal splits).
- [ ] Add rounding logic to `expense.controller.ts` (ensure payer absorbs remainders).
- [ ] Implement soft-delete logic for expenses (`deletedAt` timestamps).
- [ ] Write message controller and endpoint to load the last 100 chat messages.

### Phase 7: Real-time Socket.io Orchestration
- [ ] Mount Socket.io onto the Node HTTP server in `backend/src/index.ts`.
- [ ] Write authentication middleware for Socket connection handshakes (validating JWT).
- [ ] Write event handlers:
  - `join_group` (with authorization checks).
  - `join_expense` (with authorization checks).
  - `send_message` (saves message to DB, broadcasts to expense room).
- [ ] Write triggers to emit real-time updates for added/deleted expenses and settlements to group rooms.

### Phase 8: Frontend Core & Auth Pages
- [ ] Install packages in `frontend/package.json` (`axios`, `zustand`, `lucide-react`, `@tanstack/react-query`, etc.).
- [ ] Configure Axios instance with interceptors in `frontend/src/api/client.ts` for automatic token refreshes.
- [ ] Write Zustand stores (`authStore`, `socketStore`).
- [ ] Create standard routing using React Router DOM.
- [ ] Implement Register, Login, and Protected Route components with dark mode style.

### Phase 9: Frontend Dashboards & Layout
- [ ] Implement base Layout (Navbar, Sidebar with group navigation, metric dashboards).
- [ ] Build Group Detail Dashboard (3-column desktop view, collapsible responsive mobile views).
- [ ] Integrate React Query hooks for fetching groups, active expense lists, and live balance metrics.

### Phase 10: Expense Form & Settlement UI
- [ ] Build the interactive **Expense Creation Modal**:
  - Dynamically switches tabs for splitting (Equal, Unequal, Percentage, Share).
  - Integrates real-time remainder/total validation checks and blocks submits.
- [ ] Build the **Settle Up Modal**:
  - Pre-fills suggested payments from simplified balances.
  - Allows user overrides for payer, payee, and settlement amounts.

### Phase 11: Expense Details & Sliding Chat Drawer
- [ ] Implement the sliding Drawer component overlaying group details from the right.
- [ ] Render detailed split lists.
- [ ] Integrate the real-time chat component:
  - Mounts socket listeners upon opening drawer.
  - Loads chat history via REST API.
  - Emits real-time messages and updates thread lists immediately.
  - Implements soft-delete for messages.

### Phase 12: End-to-End Verification & Deployment Setup
- [ ] Run seed scripts and log in as seeded users (Alice, Bob, Carol, Dave).
- [ ] Perform standard validation scenarios:
  - Split $10 equally among 3 users (verify Alice gets $3.34 as payer, Bob and Carol get $3.33).
  - Check dynamic balance calculations under "Goa Trip" and "Flat 4B" groups.
  - Record partial settlements and verify that balances update dynamically in real time.
- [ ] Prepare deploy configurations for Railway and Vercel.

---

## 4. Verification Scenarios & Test Protocol

To confirm correctness before declaring the project complete, the following scenarios from the seed data must be tested:

1. **Rounding Verification**:
   - Create a $10.00 equal expense paid by User A split 3 ways (User A, B, C).
   - Assert: User A owes $3.34 (payer absorbs remaining $0.01 cent), User B owes $3.33, User C owes $3.33.
2. **Simplified Debt Graph**:
   - Under "Goa Trip 2024", verify that raw transactions match calculated simplified transactions correctly.
   - Run manual settlements and verify that simplified debt graphs reduce.
3. **Leave Group Constraint**:
   - Attempt to remove Bob from "Goa Trip" where he has active debts.
   - Assert: Error message "Settle all debts before leaving the group." is returned.
   - Settle up all Bob's debts to $0.00, then remove Bob.
   - Assert: Bob is marked inactive, but past history remains.
