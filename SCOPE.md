# Simona Singh's Spreetail — Ingestion Scope & Schema Blueprint

This document details the CSV ingestion boundaries, data anomalies handled, and the underlying relational database schema for the Spreetail P2P expense platform deployed at [spreetail-frontend.onrender.com](https://spreetail-frontend.onrender.com/).

---

## 1. CSV Data Ingestion Anomaly Log

In the import of historical group travel and roommate balance sheets via CSV files, the ingestion script identified and handled several data inconsistencies:

### Detected Anomalies & Resolutions:

1. **Anomaly: Missing Participant Identifiers**
   - *Description*: Expense rows in the CSV listed participants by name (e.g. `"Alice"`, `"Bob"`) instead of registered emails.
   - *Action Taken*: Programmed a lookup index matching user names to active group memberships. Rows that couldn't be resolved were rejected and logged in the import report.

2. **Anomaly: String-Formatted Floating Points**
   - *Description*: Ingested split numbers contained string markers like `"fifty dollars"` or had format mismatches such as `$120.505`.
   - *Action Taken*: Sanitized columns using a regex numbers extractor, rounding values to exactly 2 decimal places before parsing them to Decimal objects.

3. **Anomaly: Split Percent Mismatches**
   - *Description*: Percent split records for group accommodations totaled `99.98%` or `100.02%` due to division remainders.
   - *Action Taken*: Calculated differences and automatically added/subtracted the cent-level fractions from the group manager's share, ensuring the total always equals exactly `100.00%`.

4. **Anomaly: Null Payment Methods in Payouts**
   - *Description*: Settlement rows missing payment types were parsed.
   - *Action Taken*: Applied a default badge type of `CASH` to prevent API parsing exceptions.

---

## 2. Database Schema (Prisma Blueprint)

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
