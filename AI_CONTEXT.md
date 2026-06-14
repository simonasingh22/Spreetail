# AI Context: Splitwise Clone Assignment

## Tech Stack Decisions (Pre-decided)
- **Backend:** Node.js + Express
- **Database:** PostgreSQL (relational)
- **Frontend:** React + Vite + TypeScript + Tailwind CSS
- **Real-time:** Socket.io (for expense chat)
- **Auth:** JWT (access + refresh tokens)
- **Deployment:** Railway (backend + DB) + Vercel (frontend)
- **ORM:** Prisma

## Product Scope & Requirements

### 1. Target Audience & Core Use Case
- **Use Case**: General peer-to-peer expense tracking (roommates, trips, group outings).
- **Primary Goal**: Accurate debt tracking and simplified settlement across groups.

### 2. Feature Scope
- **Groups**: Mandatory. Includes creating groups, inviting members by email, adding/removing members, and tracking group-level balances.
- **Friends (Non-Group Expenses)**: **Out of scope for MVP.** All expenses must belong to a group.
- **Expense Splitting**: Four mandatory splitting methods:
  - Equal split
  - Unequal (exact amounts)
  - Percentage
  - By share (ratio-based)
- **Debt Simplification**: Mandatory. Implement the "minimize transactions" algorithm for group balances.
- **Settlement Process**: Manual recording only. No integration with payment gateways (Venmo, UPI, etc.) or mock payment flows. Users click "Settle up", enter the amount, and a payment is recorded, adjusting the balances.
- **Currency**: Single currency support only: **USD ($)**.

### 3. Hard Boundaries (Out of Scope)
- Multiple currencies
- Receipt scanning / OCR
- Activity log / audit trail
- External payment gateways
- Email notifications / external invitations (inviting is done by searching registered emails only)
- Mobile application (responsive Web App only)

### 4. User Authentication & Identity
- **Registration**: Required fields are `name`, `email`, and `password`. No phone number or avatar upload.
- **Avatar**: Initials-based avatar generated on the frontend (using the first letter of their name).
- **Session**: No email verification. Auto-login immediately after registration. Returns access token + refresh token along with the user object.

### 5. Group Management & Membership
- **Adding Members**: Added by searching registered email.
  - If the email exists: immediately added to the group with no approval flow.
  - If the email does NOT exist: block the action and return an error: *"No user found with this email. Ask them to register first."* No dummy/pending users.
- **Roles & Permissions**:
  - **Admin (Group Creator)**: Can rename the group, remove members, and delete the group.
  - **All Members**: Can invite new members, add expenses, and edit their own expenses.
  - **Editing Restrictions**: A non-admin member cannot edit another member's expense; only the creator of that expense or the Group Admin can edit or delete it.
- **Leaving/Removing Members**:
  - Validations: A member cannot leave or be removed if their net balance in the group is non-zero (must be exactly $0.00). Shows error: *"Settle all debts before leaving the group."*
  - History Preservation: If the balance is zero, the member is soft-removed (marked inactive in the database group-membership mapping). Historical expense records and participation list are preserved. The removed user's name remains visible in past expense details.

### 6. Expense Lifecycle & Splitting
- **Fields**: Required fields are `Description`, `Amount` (USD), `Date` (defaulting to current date via a date picker, stored as a timestamp in DB), `Paid By` (single payer), `Split Method`, and `Participants` list. No category field.
- **Payers**: Single payer only per expense.
- **Splitting Methods & Validation**:
  - **Equal**: Simple division of `Amount` / `number of participants`.
  - **Unequal (exact amounts)**: Frontend validates that the sum of exact amounts equals the total expense amount. Displays real-time running sum and remaining amount. Blocks submission if incorrect.
  - **Percentage**: Frontend validates that the sum of percentages equals 100%. Displays real-time running sum. Blocks submission if incorrect.
  - **By share**: User enters integer shares per participant (0 shares = not participating). Backend calculates: owes = `(shares / total_shares) * total_amount`. At least one share must be > 0.
- **Rounding Rule**: The payer absorbs any remaining cents. Flooring is applied to all participants, and the remainder is added to the payer's share (e.g., $10 split 3 ways results in $3.33 for non-payers, $3.34 for the payer).
- **Modification & Deletion**:
  - Balances are computed dynamically from live database queries at request time.
  - Edits/deletions are never blocked by settlements; balances adjust dynamically.
  - Deletion uses soft-delete (`deletedAt` timestamp). Soft-deleted expenses are excluded from balance calculations.
  - Only the expense creator or the group admin can edit or delete an expense.
  - Editing replaces the entire expense and all its participant splits (full replacement, no partial updates).

### 7. Balance Calculations & Debt Simplification
- **Display**: Primary view displays **simplified debts** on the group dashboard. A toggle ("Show detailed breakdown") allows users to see the raw per-expense debts.
- **Algorithm Execution**: Runs dynamically in memory on every group dashboard load (no database caching).
- **Logic Steps**:
  1. Fetch all non-deleted expenses and participant splits for the group.
  2. Fetch all settlements for the group.
  3. Construct a net balance map for all group members (paid amount minus owed amount).
  4. Perform greedy debt minimization: identify the largest creditor and largest debtor, create a simplified transaction between them, adjust their net balances, and repeat until all balances are zero.
  5. Return the list of simplified transactions to the client.

### 8. Settlement Process
- **Record Entry**: Manual recording via a separate `Settlement` table.
- **Settlement Schema**: `id`, `groupId`, `payerId`, `payeeId`, `amount`, `note` (optional), `createdAt`.
- **Settle Up Workflow**: Guided recommendations. Clicking "Settle Up" pre-fills the form with the suggested payee and amount from the simplified transactions. Users can override both before saving.
- **Partial Settlements**: Fully supported. Unpaid balances continue to be calculated dynamically in future requests.
- **Modification**: Settlements are read-only and **cannot be edited**. To correct an error, a user must hard-delete the settlement record and submit a new one.
- **Deletion Rules**: Only the payer or the group admin can delete a settlement. The payee cannot. Deleting a settlement immediately triggers balance recalculation.

### 9. Real-time Expense Chat & Updates
- **Chat Context**: Tied to individual **Expenses**, not general groups. Each expense has its own persistent comment thread.
- **Persistence**: Chat messages persist in the DB.
- **Chat Table Schema**: `id` (UUID), `expenseId` (FK → Expense), `senderId` (FK → User), `content` (text, max 1000 characters), `deletedAt` (timestamp, optional).
- **Chat Message Editing/Deletion**: Editing is NOT allowed. Only the sender can delete their message.
  - Deleting a message is a soft-delete: the database row is updated to set `deletedAt` timestamp and content to `null`.
  - In the UI, a deleted message is replaced with a placeholder: *"This message was deleted."*
- **Message Loading**: Load the last 100 messages when the expense chat is opened (no infinite scroll required for MVP).
- **Socket.io Connection & Handshake Auth**:
  - JWT access token is passed in the auth object during handshake: `socket = io(URL, { auth: { token: accessToken } })`.
  - Server-side middleware extracts, verifies the token, and attaches the decoded `userId` to the socket instance. Rejects invalid connections.
- **Room Join Authorization**:
  - **Expense Room (`expense:${expenseId}`)**: On `join_expense` event, server verifies if the user is an active member of the group the expense belongs to. If yes, joins the socket room. Else, emits an error.
  - **Group Room (`group:${groupId}`)**: On `join_group` event, server verifies if the user is an active member of the group. If yes, joins the socket room.
- **Real-time Broadcasts**:
  - Events broadcast to the Group Room (`group:${groupId}`):
    - `expense_added` (payload: `{ expense }`) - triggers expense list reload.
    - `expense_deleted` (payload: `{ expenseId }`) - removes the expense from the frontend list.
    - `settlement_added` (payload: `{ settlement }`) - triggers group balance recalculation.
  - Real-time updates for expense edits are out of scope (requires manual refresh).

#### Socket Events Contract
| Event name | Direction | Payload |
|---|---|---|
| `join_expense` | Client -> Server | `{ expenseId: string }` |
| `joined_room` | Server -> Client | `{ expenseId: string }` |
| `send_message` | Client -> Server | `{ expenseId: string, content: string }` |
| `new_message` | Server -> Client | `{ id: string, expenseId: string, userId: string, userName: string, content: string \| null, createdAt: string }` |
| `error` | Server -> Client | `{ message: string }` |

### 10. Design & UI/UX Specs
- **Theme**: Dark mode by default, Slate & Indigo aesthetic.
  - Background: slate-950 (#020617) and slate-900 (#0f172a)
  - Surface/Cards: slate-800 (#1e293b) with slate-700 borders
  - Primary Accent: indigo-500 (#6366f1) for CTAs, active states, and links
  - Success/Owed: emerald-400 (#34d399)
  - Danger/Owes: rose-400 (#fb7185)
  - Text: slate-100 primary, slate-400 muted/secondary
- **Visual Styles**:
  - Modals and drawers use subtle glassmorphism (`backdrop-blur-md` + `bg-slate-800/80` + `border border-slate-700/50`).
  - Micro-animations: page fade-in (200ms), modal open scale & fade (150ms), staggered fade-in for list items, count-up animation for balance numbers on dashboard load, subtle translation on card hover (translate-y-0.5).
  - typography: Inter font.
- **Layout Structure**:
  - **Auth**: Centered cards with a CSS-only background gradient blob.
  - **Main Dashboard (`/`)**:
    - Navbar: Logo left, user avatar + name right, Logout CTA.
    - Left Sidebar (240px): List of groups with unread badge indicators.
    - Main Panel: Two global metric cards at top ("Owed $X" and "Owe $Y"), followed by an activity feed of the 10 most recent expenses across all groups.
    - Floating Action Button (+): Opens Create Group Modal.
  - **Group Detail View (`/groups/:id`)** (Three-column layout):
    - Left Sidebar (220px): Group member list with avatars, invite email input, settings icon (rename, delete, leave for Admin).
    - Center (Flex-1): Expense list (shows date, description, paid by, amount, split badge). Clicking a row opens the Expense Detail Drawer.
    - Right Sidebar (280px): "Group Balances" header, simplified debts listing, "Show raw debts" toggle, full-width indigo "Settle Up" CTA, and a list of the last 5 settlements.
  - **Responsive Design**: Collapses to single column on mobile (below 768px). Left sidebar becomes hamburger drawer, right sidebar becomes a bottom sheet.
- **Modals & Drawers**:
  - **Expense Creation/Editing**: Centered modal overlay (`max-w-lg`).
  - **Expense Details & Chat**: Right-aligned sliding drawer (`420px` wide on desktop, full screen on mobile) overlaying with a dark backdrop. Shows expense breakdown summary at the top, a divider, and a scrollable chat thread with a message input pinned to the bottom. Edit/Delete buttons are displayed for admins or creators.
- **Expense Creation Form UX**:
  - Checkbox list for participant selection.
  - Dropdown menu for payer selection (defaults to current user).
  - Tab selection for split methods:
    - *Equal*: Checkbox list of members, displays calculated read-only split values. Unchecking recalculates split.
    - *Unequal*: Number input (USD) next to checked members. Real-time "Remaining: $X.XX" indicator. Blocks submit unless remaining is 0.
    - *Percentage*: Number input (%) next to checked members. Real-time "Total: XX%" indicator. Blocks submit unless total is 100%.
    - *By Share*: Integer stepper (+/-) next to checked members. Real-time read-only calculated split value next to each share.
  - Submissions are blocked if no participant has a share/value > 0.

### 11. Database Schema & Prisma Models

```prisma
model User {
  id            String    @id @default(uuid())
  name          String
  email         String    @unique
  passwordHash  String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  groupMembers  GroupMember[]
  paidExpenses  Expense[] @relation("PaidBy")
  createdExpenses Expense[] @relation("CreatedBy")
  expenseParticipants ExpenseParticipant[]
  sentSettlements     Settlement[] @relation("Payer")
  receivedSettlements Settlement[] @relation("Payee")
  chatMessages  ChatMessage[]
  refreshTokens RefreshToken[]
}

model Group {
  id          String    @id @default(uuid())
  name        String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  members     GroupMember[]
  expenses    Expense[]
  settlements Settlement[]
}

model GroupMember {
  id        String   @id @default(uuid())
  groupId   String
  userId    String
  role      GroupRole @default(MEMBER)
  isActive  Boolean  @default(true)
  joinedAt  DateTime @default(now())
  group     Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([groupId, userId])
}

model Expense {
  id           String       @id @default(uuid())
  groupId      String
  description  String
  amount       Decimal      @db.Decimal(10, 2)
  date         DateTime
  paidById     String
  createdById  String
  splitMethod  SplitMethod
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
  deletedAt    DateTime?
  group        Group        @relation(fields: [groupId], references: [id], onDelete: Cascade)
  paidBy       User         @relation("PaidBy", fields: [paidById], references: [id])
  createdBy    User         @relation("CreatedBy", fields: [createdById], references: [id])
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
  id        String   @id @default(uuid())
  groupId   String
  payerId   String
  payeeId   String
  amount    Decimal  @db.Decimal(10, 2)
  note      String?
  createdAt DateTime @default(now())
  group     Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  payer     User     @relation("Payer", fields: [payerId], references: [id])
  payee     User     @relation("Payee", fields: [payeeId], references: [id])
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

### 12. API Route & Controller Specs

#### Auth Endpoints
- **`POST /api/auth/register`**: Registers a new user. Returns user data, access token, and refresh token.
- **`POST /api/auth/login`**: Authenticates user credentials. Clears old refresh tokens, saves new refresh token in DB, and returns user, access token, and refresh token.
- **`POST /api/auth/refresh`**: Generates a new access token using a valid, active refresh token from DB.
- **`POST /api/auth/logout`**: Removes the refresh token from the database, invalidating the session.

#### Groups Endpoints
- **`POST /api/groups`**: Creates a new group. The creator is added to `GroupMember` as `ADMIN`.
- **`GET /api/groups`**: Lists all active groups where the user is a member (`isActive: true`).
- **`GET /api/groups/:id`**: Fetches details for a group, including member details, active expenses, and settlements.
- **`PUT /api/groups/:id`**: Renames the group. Restricted to group `ADMIN`.
- **`DELETE /api/groups/:id`**: Hard-deletes the group and cascades to all members, expenses, settlements, and messages. Restricted to group `ADMIN`.
- **`POST /api/groups/:id/members`**: Invites a user by email. Verification checks if email exists in DB. If yes, inserts a `GroupMember` row (or sets `isActive: true` if they previously left).
- **`DELETE /api/groups/:id/members/:userId`**: Soft-removes a member. Validates that the member's net balance is exactly $0.00. Marks `GroupMember.isActive = false`.

#### Expenses Endpoints
- **`POST /api/groups/:groupId/expenses`**: Creates a new expense in a group. Restricts access to group members. Triggers calculation of participant splits, applies rounding rules (remainder to payer), and inserts `Expense` and `ExpenseParticipant` rows.
- **`GET /api/groups/:groupId/expenses`**: Lists all active expenses (`deletedAt: null`) for a group.
- **`GET /api/expenses/:id`**: Fetches a single expense's detailed splits and information.
- **`PUT /api/expenses/:id`**: Replaces the full expense and all splits. Only allowed for the creator or the group admin.
- **`DELETE /api/expenses/:id`**: Soft-deletes the expense by setting `deletedAt = now()`. Allowed for creator or admin only.

#### Balances Endpoints
- **`GET /api/groups/:groupId/balances`**: Fetches balances for a group. Calculates simplified debts dynamically in-memory and returns `{ simplified: [], raw: [], individualSummary: {} }`.

#### Settlements Endpoints
- **`POST /api/groups/:groupId/settlements`**: Records a manual payment settlement between group members.
- **`GET /api/groups/:groupId/settlements`**: Lists the last 5 settlements for the group.
- **`DELETE /api/settlements/:id`**: Deletes a settlement record. Restricted to the payer or the group admin.

#### Chat Endpoints
- **`GET /api/expenses/:id/messages`**: Retrieves the last 100 messages for an expense chat.
- **`DELETE /api/messages/:id`**: Soft-deletes a chat message by setting content to `null` and `deletedAt` to current timestamp. Restricted to the sender.

#### Error & Response Format
- **Success Response**: `{ data: <payload>, message: "string" }`
- **Error Response**: `{ error: "string", details?: [] }`
- **HTTP Status Codes**: `200` (OK), `201` (Created), `400` (Bad Request), `401` (Unauthorized), `403` (Forbidden), `404` (Not Found), `500` (Internal Server Error).

### 13. Security, Session & JWT Architecture
- **Password Hashing**: Bcrypt with salt rounds = `12`.
- **JWT Expiration Rules**:
  - Access Token: `15 minutes` expiration, signed with `JWT_ACCESS_SECRET` (HS256). Payload: `{ userId, email, iat, exp }`.
  - Refresh Token: `7 days` expiration, signed with `JWT_REFRESH_SECRET` (HS256). Payload: `{ userId, tokenId, iat, exp }` where `tokenId` maps to `RefreshToken.id` in PostgreSQL.
- **Refresh Token Rotation**: On any `/api/auth/refresh` request:
  1. Verify incoming refresh token signature/expiry.
  2. Query `RefreshToken` table with token hash. Reject if not found.
  3. Delete the used `RefreshToken` record.
  4. Generate and save a new `RefreshToken` record.
  5. Issue a new access token + new refresh token to the client.
- **Client Storage**:
  - Refresh token stored in client browser as an `httpOnly` cookie.
  - Access token stored only in-memory (e.g. Zustand client store).
  - App mounts perform a silent refresh via `/api/auth/refresh` to restore user session.

### 14. Input Schema Validation (Zod)
- Location: `src/validators/` with schema files per domain.
- Middleware: `validateRequest(schema: ZodSchema)` validates `req.body` and returns detailed validation failures (`400 Bad Request`) if invalid.
- Schema Rules:
  - **Register**: name (2-50 chars), email (valid format), password (min 8 chars).
  - **Login**: email (valid format), password (non-empty).
  - **Expense**: amount (positive decimal, max 999,999.99), description (1-200 chars), date (valid ISO date, maximum +1 day into future), splits array (non-empty, with UUIDs, percentage splits 0.01-100, share splits non-negative integers).
  - **Settlement**: amount (positive decimal, max 999,999.99), payeeId (valid UUID, distinct from payerId).
  - **ChatMessage**: content (1-1000 chars).

### 15. Database Seeding Script (`prisma/seed.ts`)
- Configured in `package.json` under `"prisma": { "seed": "ts-node prisma/seed.ts" }`. Run with `npx prisma db seed`.
- **Execution Lifecycle**: Triggers a clean step first, deleting tables in reverse foreign key order, then inserts seed data. Passwords are hashed with bcrypt (salt rounds = 12). Logs "Seeding complete" on completion.
- **Seeded Users**:
  - **Alice Chen** | `alice@test.com` | Password: `Test1234!`
  - **Bob Kumar** | `bob@test.com` | Password: `Test1234!`
  - **Carol Smith** | `carol@test.com` | Password: `Test1234!`
  - **Dave Wilson** | `dave@test.com` | Password: `Test1234!`
- **Seeded Group 1**: `"Goa Trip 2024"` (Admin: Alice, Members: Bob, Carol, Dave)
  - **Expense 1**: `"Hotel booking"` $300, Paid by: Alice. Split: EQUAL (4 ways = $75 each).
  - **Expense 2**: `"Scuba diving"` $200, Paid by: Bob. Split: PERCENTAGE (Alice 40% = $80, Bob 30% = $60, Carol 30% = $60).
  - **Expense 3**: `"Dinner at Titos"` $120, Paid by: Carol. Split: UNEQUAL (Alice $50, Bob $40, Carol $30).
  - **Expense 4**: `"Taxi to airport"` $80, Paid by: Dave. Split: SHARE (Alice 2, Bob 2, Carol 1, Dave 1. Total shares = 6. Alice $26.67, Bob $26.67, Carol $13.33, Dave $13.33. Rounded: Dave absorbs $0.00 remainder).
  - **Settlement**: Dave paid Alice $40 (partial settlement).
- **Seeded Group 2**: `"Flat 4B Expenses"` (Admin: Alice, Members: Bob, Carol)
  - **Expense 1**: `"Monthly rent"` $1500, Paid by: Alice. Split: EQUAL (3 ways = $500 each).
  - **Expense 2**: `"Electricity bill"` $90, Paid by: Bob. Split: EQUAL (3 ways = $30 each).

### 16. Codebase Directory Layout

```
splitwise-clone/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── group.controller.ts
│   │   │   ├── expense.controller.ts
│   │   │   ├── settlement.controller.ts
│   │   │   └── chat.controller.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   └── validateRequest.middleware.ts
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── group.routes.ts
│   │   │   ├── expense.routes.ts
│   │   │   ├── settlement.routes.ts
│   │   │   └── chat.routes.ts
│   │   ├── services/
│   │   │   ├── balance.service.ts
│   │   │   └── socket.service.ts
│   │   ├── validators/
│   │   │   ├── auth.validators.ts
│   │   │   ├── group.validators.ts
│   │   │   ├── expense.validators.ts
│   │   │   └── settlement.validators.ts
│   │   ├── utils/
│   │   │   ├── jwt.utils.ts
│   │   │   └── hash.utils.ts
│   │   ├── socket/
│   │   │   └── index.ts
│   │   ├── app.ts
│   │   └── index.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts
│   │   │   ├── auth.api.ts
│   │   │   ├── group.api.ts
│   │   │   ├── expense.api.ts
│   │   │   ├── settlement.api.ts
│   │   │   └── chat.api.ts
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Navbar.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── ProtectedRoute.tsx
│   │   │   ├── groups/
│   │   │   │   ├── GroupCard.tsx
│   │   │   │   ├── CreateGroupModal.tsx
│   │   │   │   └── MemberList.tsx
│   │   │   ├── expenses/
│   │   │   │   ├── ExpenseRow.tsx
│   │   │   │   ├── CreateExpenseModal.tsx
│   │   │   │   ├── ExpenseDrawer.tsx
│   │   │   │   └── SplitForm.tsx
│   │   │   ├── balances/
│   │   │   │   ├── BalanceSummary.tsx
│   │   │   │   └── SettleUpModal.tsx
│   │   │   └── chat/
│   │   │       ├── ChatThread.tsx
│   │   │       └── ChatInput.tsx
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   └── GroupDetailPage.tsx
│   │   ├── stores/
│   │   │   ├── authStore.ts
│   │   │   ├── groupStore.ts
│   │   │   └── socketStore.ts
│   │   ├── hooks/
│   │   │   ├── useExpenseChat.ts
│   │   │   └── useGroupSocket.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   └── balance.utils.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── index.html
│   ├── vercel.json
│   ├── .env
│   ├── .env.example
│   ├── tailwind.config.ts
│   ├── vite.config.ts
│   └── package.json
├── AI_CONTEXT.md
├── BUILD_PLAN.md
└── README.md
```

### 17. Frontend Libraries & Packages
- **State Management**: Zustand (Auth, Group, and Socket client state).
- **HTTP Client**: Axios with interceptors to automatically fetch new access tokens from `/api/auth/refresh` on a `401 Unauthorized` response.
- **Routing**: React Router DOM v6.
- **Icons**: Lucide React.
- **Development Dependencies**:
  - `axios`, `react-router-dom`, `zustand`, `lucide-react`, `socket.io-client`, `@tanstack/react-query`, `react-hot-toast`, `date-fns`, `clsx`.
  - React Query manages caching and remote server state; Zustand manages in-memory local-only state.

### 18. Build & Deployment Configuration
- **Vercel Client Redirects**: `vercel.json` rewrite rule maps all requests `/(.*)` to `/index.html` to support SPA clients.
- **Railway Backend Config**:
  - `tsconfig.json` compiles to `./dist` output directory.
  - Scripts:
    - `"build": "tsc --project tsconfig.json"`
    - `"start": "node dist/src/index.js"`
    - `"dev": "ts-node-dev --respawn --transpile-only src/index.ts"`
    - `"db:migrate": "prisma migrate deploy"`
    - `"db:seed": "ts-node prisma/seed.ts"`
  - Build command: `npm install && npm run build && npx prisma generate`
  - Start command: `npm start`
- **Dependencies List**:
  - `express`, `@types/express`, `typescript`, `ts-node-dev`, `@prisma/client`, `prisma`, `bcrypt`, `@types/bcrypt`, `jsonwebtoken`, `@types/jsonwebtoken`, `zod`, `socket.io`, `cors`, `@types/cors`, `helmet`, `cookie-parser`, `@types/cookie-parser`, `dotenv`, `uuid`, `types/uuid`.

### 19. Core Schema & Balance Algorithm Details

#### Database Schema Decisions
1. **ExpenseParticipant Table**:
   - Stores `amountOwed` (Decimal/Float, the calculated share value floored to cents).
   - Stores `shareValue` (Float, optional, holds the raw user input like percentages or shares) to allow the frontend to reconstruct the original split input values when editing/viewing expenses.
2. **RefreshToken Table**:
   - Stores token hashes in the database mapped to `userId`. Allows the server to perform server-side revocation on logout or detect token reuse/rotation violations.
3. **Soft Deletes**:
   - Expenses use `deletedAt` soft deletes. Soft-deleted expenses are excluded from all balance calculations.
   - Settlements are read-only. Corrections are made by hard-deleting a settlement record and creating a new one.

#### Balance & Settlement Algorithms
1. **Dynamic Balance Calculation**:
   - Balances are computed entirely in memory on request, querying live, non-deleted expenses, splits, and settlements.
   - **Step 1**: Sum all active expenses and credits/debits per member:
     - `net = total_paid - total_owed_in_splits`
     - Payer receives credit (+amount), participants receive debit (-amountOwed).
   - **Step 2**: Adjust net balances with recorded settlements:
     - Payer of settlement receives credit (+settledAmount), payee receives debit (-settledAmount).
2. **Greedy Debt Simplification (Optimal)**:
   - Identify active debtors (net balance < 0) and creditors (net balance > 0).
   - Sort debtors ascending (most negative first) and creditors descending (most positive first).
   - Match the largest debtor with the largest creditor:
     - Transfer `min(|debtorBalance|, creditorBalance)`.
     - Update balances, insert transaction into simplified debts array, and move to the next member when their balance reaches 0.
     - Repeat until all net balances are simplified to zero.
3. **Raw Debt Calculation**:
   - Compute pairwise debts by aggregating exact splits minus settlements between each pair.
   - Let A and B be a pair. Net what A owes B and B owes A to return raw debt.

### 20. Production Deployment Specs & Target URLs

- **Backend Service (Railway)**:
  - **Deployed URL**: `https://spreetail-backend.up.railway.app`
  - **Environment Variables**:
    - `DATABASE_URL`: (Auto-injected by Railway PostgreSQL Plugin)
    - `JWT_ACCESS_SECRET`: `jwt_prod_access_secret_token_secure_string_value_64_chars_min`
    - `JWT_REFRESH_SECRET`: `jwt_prod_refresh_secret_token_secure_string_value_64_chars_min`
    - `PORT`: `3000`
    - `CORS_ORIGIN`: `https://spreetail.vercel.app`
    - `NODE_ENV`: `production`
    - `BCRYPT_SALT_ROUNDS`: `12`
  - **Build Command**: `npm install && npm run build && npx prisma generate`
  - **Start Command**: `node dist/index.js` (Defined in `Procfile` / `package.json`)
  - **Post-Deploy Migration Command**: `npx prisma migrate deploy`

- **Frontend Service (Vercel)**:
  - **Deployed URL**: `https://spreetail.vercel.app`
  - **Environment Variables**:
    - `VITE_API_URL`: `https://spreetail-backend.up.railway.app`
    - `VITE_SOCKET_URL`: `https://spreetail-backend.up.railway.app`
  - **Build Command**: `npm run build`
  - **Output Directory**: `dist`
  - **Single Page Application Routing**: Configured via `vercel.json` rewriting `/(.*)` to `/index.html` to support client-side routing.
