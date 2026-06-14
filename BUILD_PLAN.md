# Build Plan & AI Collaboration: Spreetail Clone (Splitwise)

This document outlines the product research findings, system architecture, collaboration workflows, and construction process utilized during the development of the Spreetail clone.

---

## 1. Splitwise Product Research Findings

Our research into Splitwise's core mechanics revealed several critical functional requirements:
1. **Dynamic standing balances vs static history**: Splitwise does not store static balance records in database fields. Instead, it aggregates expenses, splits, and settlements in real time. This avoids double-entry bookkeeping synchronization errors.
2. **Simplified Debt Graph**: Left to simple pairwise balances, a group of 4 people could require up to 6 different payments to settle up. Splitwise utilizes a greedy matching algorithm to reduce this, routing debts from the largest debtors directly to the largest creditors.
3. **Rounding Correction**: Because currency uses 2 decimal places, dividing an amount like `$10.00` three ways leaves a remainder cent (`$10.00 - $3.33 * 3 = $0.01`). Splitwise handles this by assigning the remainder to the payer of the expense, ensuring total balances are mathematically complete.
4. **Immediate vs Deferred Bills**: Many users prefer settling splits immediately (e.g., at the cash register) rather than recording group debts. Integrating "Pay Now" alongside standard splits keeps group transactions clean.

---

## 2. ASCII System Architecture Diagram

```
                 +-----------------------------------------------+
                 |              React Vite Frontend              |
                 |  (Zustand Auth Store / React Query Caching)   |
                 +-------+-------------------------------+-------+
                         |                               |
              REST (JSON APIs)                  WebSocket (Socket.io)
                         |                               |
                         v                               v
                 +-------+-------------------------------+-------+
                 |              Express Node Backend             |
                 |     (Zod Validators / JWT Auth Verification)  |
                 +-----------------------+-----------------------+
                                         |
                                    Prisma ORM
                                         |
                                         v
                               +---------+---------+
                               |    PostgreSQL     |
                               |  Database Engine  |
                               +-------------------+
```

---

## 3. AI Collaboration Process & Context Management

Throughout the development lifecycle, we maintained a highly structured collaboration model:
1. **AI_CONTEXT.md as the Single Source of Truth**: 
   - Every feature constraint, route contract, and database migration was documented inside `AI_CONTEXT.md` before execution.
   - When introducing changes (like adding payment methods or the "Pay Now" flow), the schema and API design tables in `AI_CONTEXT.md` were modified first, preventing design drift.
2. **Interactive Incremental Development**:
   - Built the system phase-by-phase (Database -> Auth -> Group APIs -> Splitting Engines -> Sockets -> UI Components -> Integration).
   - Each phase ended with a compile-check and git checkpoint, securing the code before moving forward.
3. **Compaction Session Resiliency**:
   - Because long conversations are compacted, the state was fully preserved in `AI_CONTEXT.md` and `BUILD_PLAN.md`. This allowed the agent to resume work with 100% precision without loss of context.

---

## 4. Trade-offs & Simplifications

- **In-Memory Simplification**: Calculating balances dynamically on every load is highly accurate and simple to implement. However, for groups with thousands of transactions, caching pre-computed balances using database triggers would be required in production.
- **Single Currency (USD)**: To prevent exchange rate fluctuating inaccuracies, the scope was simplified to only support USD (`$`).
- **No SMS or Email Deliveries**: Invitations to new members are based on searching registered database emails. If a user is not registered, they cannot be added. This avoids integration dependencies with external SMTP/Twilio gateways for the MVP.
- **Soft-removed Members**: If a member leaves a group with a `$0.00` balance, they are flagged as `isActive: false` in `GroupMember` rather than deleted. This preserves historical integrity, ensuring their name still appears on past group expenses they participated in.

---

## 5. Phase-by-Phase Build Logs

### Phase 1: Setup & Scaffolding
- Root repository initialization.
- Creation of isolated `/backend` and `/frontend` packages.
- Added tsconfig configs, dotenv environment profiles, and Vercel routing configs.

### Phase 2: Relational Schema Design
- Programmed PostgreSQL Prisma schema detailing users, memberships, expenses, splits, settlements, and messages.
- Executed migrations and wrote `seed.ts` containing Goa Trip test details.

### Phase 3-4: JWT Auth & Member Management
- Created password hashing utilities (Bcrypt) and JWT token signers.
- Implemented cookie-based refresh token rotations.
- Implemented member invitation APIs.

### Phase 5-6: Balance Services & Expense Splits
- Wrote the Greedy Debt Minimization algorithm.
- Programmed dynamic split math (Equal, Unequal, Percent, Shares) and penny adjustment checks.
- Handled decimal serialization casting.

### Phase 7-8: WebSockets & Frontend Styling
- Mounted Socket.io handlers, room join restrictions, and chat triggers.
- Styled a sleek Slate & Indigo dark-themed workspace with glassmorphic cards and drawer comment overlays.

### Phase 9: Production Polish & Settlements
- Added "Pay Now" immediate split options creating transactional settlements.
- Integrated payment method indicators (Cash, Bank, Venmo, PayPal, UPI, Credit Card).
- Resolved Decimal string rendering crashes in frontend maps.
- Deployed backend on Railway and frontend on Vercel.
