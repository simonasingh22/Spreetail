# AI_CONTEXT.md

This document serves as the absolute source of truth for the Spreetail clone codebase context, containing architecture decisions, specifications, database schemas, API specs, and build history.

## Product understanding
Spreetail is a peer-to-peer expense tracking and debt settlement application designed for groups of users (e.g., roommates, trip companions, coworkers) who share expenditures. The system aggregates peer splits, calculates pairwise obligations, simplifies transactions using a Greedy Debt Minimization algorithm, tracks individual settlements, and enables real-time messaging per expense.

## Product scope (in scope / out of scope)
### In Scope
- **User Accounts**: Registration, login, and secure token rotation sessions. Initials-based avatar creation.
- **Group Management**: Group creation, name editing, deletion, member search and instant invitations by email.
- **Expense Creation**: Stepper wizard with 4 split options (Equal, Unequal, Percent, Shares) and penny rounding adjustments.
- **Pay Now vs Pay Later**: Choose standard split logging (Pay Later) or immediate settlement (Pay Now) which logs settlements transactionally.
- **Payment Method Selectors**: Cash, Bank Transfer, Venmo, PayPal, UPI, Credit Card supported during settlement.
- **Greedy Debt Simplification**: In-memory algorithm to reduce group-level transactions.
- **Real-Time Messaging**: Websocket chat rooms per expense with message soft-deletions.

### Out of Scope
- Non-group expenses (all transactions must happen inside a group context).
- Multi-currency support (exclusively USD).
- Automated payment gateways (mock/manual settlement logging only).
- OCR receipt scanning or file attachments.
- Activity audit logs.

## User personas
1. **The Trip Planner (Alice)**: Creates groups, organizes outings, inputs large expenses, and handles administrative permissions (removing members, deleting groups).
2. **The Passive Member (Bob)**: Joins trips, gets split values assigned, reviews what he owes, and records settlements when paying back the group.
3. **The Instant Settler (Carol)**: Prefers paying back instantly at the moment of billing rather than letting debts pile up, utilizing the "Pay Now" option.

## Core workflows
### Auth Flow
- Registration/Login -> Sign Access JWT (in-memory) & Refresh JWT (secured httpOnly cookie).
- Refresh Flow -> Rotating old refresh tokens on expiry to issue brand new pairs.

### Group Flow
- Create Group -> Assigns creator as Admin.
- Add Member -> Instant addition by email search.
- Leave Group -> Validates net balance is exactly `$0.00` before allowing membership inactivation.

### Expense & Split Flow
- Input Amount -> Select Split Method -> Assign percentages/amounts -> Select Preference (Pay Now or Pay Later) -> Confirm & Post.

### Settlement Flow
- Click "Settle Up" -> Modal retrieves suggested payee/amount -> Select payment method -> Save settlement -> Balances decrease.

## Implementation decisions (with reasoning)
- **Monorepo Separation**: The backend and frontend are kept in separate folders without root-level hoisted workspaces. This ensures simple deployment configurations on cloud builders like Railway and Vercel.
- **In-Memory Calculations**: Net standing balances are computed dynamically in-memory on every dashboard request rather than cached in database tables. This preserves raw data integrity and removes desync issues.
- **Database Decimal Types**: Database splits are stored using PostgreSQL `Decimal(10, 2)` instead of double/floats, preventing binary precision representation issues (e.g., `$9.9999999`).
- **Standard Layout formless flows**: No standard `<form>` tags are utilized in the UI, avoiding native browser page refreshes or state losses. All triggers utilize React onClick hooks and State fields.

## Tech stack (with version numbers)
- **Node.js**: `v18.x` or higher
- **React**: `v18.3.x` (with Vite client compiler)
- **Express**: `v4.19.x` (HTTP REST router)
- **Prisma ORM**: `v5.14.x` (Database connector)
- **PostgreSQL**: `v15` / `v16` / `v18`
- **Socket.io**: `v4.7.x` (Real-time bidirectional gateway)
- **Zustand**: `v4.5.x` (Client-side global store)
- **Tailwind CSS**: `v3.4.x` (Utility-first style engine)

## Database schema (full Prisma schema as-is)
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                  String               @id @default(uuid())
  name                String
  email               String               @unique
  passwordHash        String
  createdAt           DateTime             @default(now())
  updatedAt           DateTime             @updatedAt
  groupMembers        GroupMember[]
  paidExpenses        Expense[]            @relation("PaidBy")
  createdExpenses     Expense[]            @relation("CreatedBy")
  expenseParticipants ExpenseParticipant[]
  sentSettlements     Settlement[]         @relation("Payer")
  receivedSettlements Settlement[]         @relation("Payee")
  chatMessages        ChatMessage[]
  refreshTokens       RefreshToken[]
}

model Group {
  id          String       @id @default(uuid())
  name        String
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  members     GroupMember[]
  expenses    Expense[]
  settlements Settlement[]
}

model GroupMember {
  id        String    @id @default(uuid())
  groupId   String
  userId    String
  role      GroupRole @default(MEMBER)
  isActive  Boolean   @default(true)
  joinedAt  DateTime  @default(now())
  group     Group     @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([groupId, userId])
}

model Expense {
  id           String               @id @default(uuid())
  groupId      String
  description  String
  amount       Decimal              @db.Decimal(10, 2)
  date         DateTime
  paidById     String
  createdById  String
  splitMethod  SplitMethod
  createdAt    DateTime             @default(now())
  updatedAt    DateTime             @updatedAt
  deletedAt    DateTime?
  group        Group                @relation(fields: [groupId], references: [id], onDelete: Cascade)
  paidBy       User                 @relation("PaidBy", fields: [paidById], references: [id])
  createdBy    User                 @relation("CreatedBy", fields: [createdById], references: [id])
  participants ExpenseParticipant[]
  messages     ChatMessage[]
}

model ExpenseParticipant {
  id          String   @id @default(uuid())
  expenseId   String
  userId      String
  amountOwed  Decimal  @db.Decimal(10, 2)
  shareValue  Float?
  createdAt   DateTime @default(now())
  expense     Expense  @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  user        User     @relation(fields: [userId], references: [id])
  @@unique([expenseId, userId])
}

model Settlement {
  id            String   @id @default(uuid())
  groupId       String
  payerId       String
  payeeId       String
  amount        Decimal  @db.Decimal(10, 2)
  note          String?
  paymentMethod String   @default("CASH")
  createdAt     DateTime @default(now())
  group         Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  payer         User     @relation("Payer", fields: [payerId], references: [id])
  payee         User     @relation("Payee", fields: [payeeId], references: [id])
}

model ChatMessage {
  id        String    @id @default(uuid())
  expenseId String
  senderId  String
  content   String?
  createdAt DateTime  @default(now())
  deletedAt DateTime?
  expense   Expense   @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  sender    User      @relation(fields: [senderId], references: [id])
}

model RefreshToken {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum GroupRole {
  ADMIN
  MEMBER
}

enum SplitMethod {
  EQUAL
  UNEQUAL
  PERCENTAGE
  SHARE
}
```

## API design (full endpoint table)
| Domain | Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- | :---: |
| **Auth** | `POST` | `/api/auth/register` | Registers user & issues rotated credentials | No |
| | `POST` | `/api/auth/login` | Logins user, returns token pair | No |
| | `POST` | `/api/auth/refresh` | Rotates session refresh tokens | No (HttpOnly Cookie) |
| | `POST` | `/api/auth/logout` | Invalidates token hash in database | Yes |
| **Groups**| `POST` | `/api/groups` | Creates group, sets user to creator (Admin) | Yes |
| | `GET` | `/api/groups` | Lists groups active for user | Yes |
| | `GET` | `/api/groups/:id` | Detailed group dashboard summary | Yes |
| | `PUT` | `/api/groups/:id` | Edits group name (Admin only) | Yes |
| | `DELETE`| `/api/groups/:id` | Cascade deletes group (Admin only) | Yes |
| | `POST` | `/api/groups/:id/members` | Invites member by registered email | Yes |
| | `DELETE`| `/api/groups/:id/members/:userId` | Soft-removes member (requires $0 balance) | Yes |
| **Expenses**| `POST`| `/api/groups/:groupId/expenses` | Creates split expense (supports Pay Now/Later)| Yes |
| | `GET` | `/api/groups/:groupId/expenses` | Lists active non-deleted expenses | Yes |
| | `GET` | `/api/expenses/:id` | Fetch specific splits & data | Yes |
| | `PUT` | `/api/expenses/:id` | Replaces expense layout & splits (Creator/Admin) | Yes |
| | `DELETE`| `/api/expenses/:id` | Soft-deletes expense record | Yes |
| **Balances**| `GET`| `/api/groups/:groupId/balances` | Fetches raw & simplified debt transactions | Yes |
| **Settlements**| `POST`| `/api/groups/:groupId/settlements`| Persists manual settlement payment | Yes |
| | `GET` | `/api/groups/:groupId/settlements`| Fetch last 5 settlements log | Yes |
| | `DELETE`| `/api/settlements/:id` | Deletes settlement log (Payer/Admin only) | Yes |
| **Chat** | `GET` | `/api/expenses/:id/messages` | Fetches last 100 comments | Yes |
| | `DELETE`| `/api/messages/:id` | Soft-deletes message (Sender only) | Yes |

## Frontend structure (file tree)
```
frontend/src/
├── api/
│   ├── client.ts             # Axios interceptor config
│   ├── auth.api.ts
│   ├── group.api.ts
│   ├── expense.api.ts
│   ├── settlement.api.ts
│   └── chat.api.ts
├── components/
│   ├── layout/
│   │   └── ProtectedRoute.tsx
│   ├── balances/
│   │   ├── BalanceSummary.tsx
│   │   └── SettleUpModal.tsx
│   └── chat/
│       ├── ChatThread.tsx
│       └── ChatInput.tsx
├── pages/
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── DashboardPage.tsx
│   ├── GroupsPage.tsx        # Dynamic dashboard
│   ├── GroupDetailPage.tsx   # Split tabbed view
│   └── CreateExpensePage.tsx # Stepper creation wizard
├── stores/
│   ├── authStore.ts          # Zustand token store
│   └── socketStore.ts
├── hooks/
│   └── useExpenseChat.ts     # Room join logic
├── types/
│   └── index.ts
└── utils/
    └── balance.utils.ts
```

## Socket.io events contract
All WebSocket actions check user membership authorization before executing rooms join commands.
- **`join_expense`** (Client -> Server): Request room join for specific chat thread. Payload: `{ expenseId: string }`
- **`joined_room`** (Server -> Client): Confirms connection to room. Payload: `{ expenseId: string }`
- **`send_message`** (Client -> Server): Post comments to backend. Payload: `{ expenseId: string, content: string }`
- **`new_message`** (Server -> Client): Broadcasts new comments. Payload: `{ id: string, expenseId: string, userId: string, userName: string, content: string | null, createdAt: string }`
- **`error`** (Server -> Client): Dispatches socket error event. Payload: `{ message: string }`

## Deployment plan (Railway + Vercel steps)
### Backend (Railway)
1. **GitHub Sync**: Connect repository, set root directory to `/backend`.
2. **Postgres Setup**: Attach Railway PostgreSQL plugin (auto-maps `DATABASE_URL`).
3. **Environment**: Add production JWT secrets, set `NODE_ENV=production`.
4. **Deploy Hooks**: The `postinstall` script runs `prisma generate`. Trigger `npx prisma migrate deploy` inside Railway terminal.

### Frontend (Vercel)
1. **GitHub Sync**: Connect repository, set root directory to `frontend`.
2. **Build Settings**: Framework Vite, output directory `dist`.
3. **Environment**: Add `VITE_API_URL` and `VITE_SOCKET_URL` pointing to backend.
4. **Single Page Routing**: Vercel reads `vercel.json` and configures rewrites to `index.html`.

## Testing plan
- **Verification Scenarios**:
  - Test $10 divided 3 ways equally: Assert Payer gets $3.34 and participants get $3.33.
  - Settle Up balance reduction tests (verifying balances dynamically reflect values immediately).
  - Validation blocks on invalid percentage splits (<100% or >100%) and unequal sums.
  - Zero-balance constraint on member deletion (attempt to leave group with debts -> verify error blocks action).

## Trade-offs made
- **Pairwise Calculations**: Dynamic calculation on load simplifies logic and removes cache desyncs, but might become a bottleneck under extremely high volumes.
- **Bcrypt**: Kept Bcrypt rather than Argon2 to prevent native code compilations from breaking during automated server building in cloud hosting services.

## Known limitations
- Standard pairwise balances do not support automated bank payouts (manually click "Settle up" only).
- All users must register an email to be added to a group (no virtual/pending members supported).

## Build session log (phases 1–8 summary)
- **Phase 1-2**: Configured PostgreSQL database and ran migrations. Configured Monorepo environment.
- **Phase 3-4**: Programmed express controllers, user registrations, group actions, and JWT HttpOnly session refreshes.
- **Phase 5-6**: Programmed split validators, rounding checks, and the Greedy optimization algorithms.
- **Phase 7-8**: Integrated Socket.io real-time triggers, page loaders, and beautiful Slate & Indigo custom CSS pages.

## Prompts used (paste each phase prompt)
Below are the phase prompts executed during the development:
1. **Compaction Phase 1**: *"Continue. The app is feature complete locally. Now deploy it."*
2. **Compaction Phase 2**: *"run project"*
3. **Compaction Phase 3**: *"audit each and every thing from UI to backend and connection and logics"*
4. **Compaction Phase 4**: *"make UI more premium and unique and production grade"*
5. **Compaction Phase 5**: *"there are still many UI errors and also when adding expense shouldn't there be a option to pay later and pay now and payment method should also be integrated"*
6. **Compaction Phase 6**: *"still shows paid by even though I clicked pay later and logically shouldnt it also show in dashboard in owed column?"*
7. **Compaction Phase 7**: *"Still shows paid check each every thing and their logic"*
8. **Compaction Phase 8**: *"when clicked on pay later after clicking both then create post now whole is like this even if I refresh it"*
9. **Compaction Phase 9**: *"git push in this repo -- https://github.com/Sarthak3131/Spreetail"*
10. **Compaction Phase 10**: *"Create a dynamic best readme with visual representation of UI and working"*
11. **Compaction Phase 11**: *"deploy"*
12. **Compaction Phase 12**: *"create dashboard and group page more unique"*
