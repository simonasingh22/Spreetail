# Simona Singh's Spreetail — Architectural Decisions Log

This document lists the significant technical and design choices made during the development of Spreetail, the alternative options evaluated, and the rationale for the final implementations.

---

### Decision 1: In-Memory Balanced Ledger Compilation
- **Options Considered**:
  - *Option A*: Maintain static net balance totals on `GroupMember` tables in PostgreSQL, updating them with database triggers.
  - *Option B (Chosen)*: Calculate obligation balances dynamically in-memory from the raw transaction logs using a Greedy Matching solver on load.
- **Rationale**:
  - Pre-calculating balances frequently results in desynchronizations due to race conditions or interrupted transaction loops. Option B compiles net standings live, ensuring math accuracy.

---

### Decision 2: Numeric Precision via Prisma Decimal
- **Options Considered**:
  - *Option A*: Store currency values as binary floating points (`Double`/`Float`).
  - *Option B (Chosen)*: Map database attributes to Prisma `Decimal(10, 2)` and parse calculations explicitly.
- **Rationale**:
  - Float arithmetic accumulates rounding precision loss over time (e.g., dividing `$100.00` three ways). By using fixed-point Decimals and a custom remainder allocator (assigning the extra penny to the payer), Spreetail is cents-safe.

---

### Decision 3: Secure Session Refresh Token Rotation
- **Options Considered**:
  - *Option A*: Cache access and refresh JSON Web Tokens (JWT) in client `localStorage`.
  - *Option B (Chosen)*: Keep access keys in memory and encrypt the refresh key in a secure, `httpOnly` cookie rotated upon each access validation.
- **Rationale**:
  - Storing sensitive tokens in local storage exposes them to script injection (XSS). Cookie isolation with `httpOnly` blocks browser script read access, securing user accounts.

---

### Decision 4: Asymmetric Screen Workspace Grid
- **Options Considered**:
  - *Option A*: Rely on a standard centered card grid for groups and balances.
  - *Option B (Chosen)*: Restructure the dashboard into an asymmetric grid (left-aligned ledger profile and standing receipt slip, right-aligned searchable active groups registry).
- **Rationale**:
  - Creates a bespoke, editorial digital ledger look rather than a generic template appearance, matching the off-black and champagne-gold theme.

---

### Decision 5: Tabbed Workspace vs. Stacked Scroll Columns
- **Options Considered**:
  - *Option A*: Stack member lists, settlements, and expense logs sequentially in long vertical scrolls.
  - *Option B (Chosen)*: Implement a tabbed mainstream workspace (Expenses, Settlements, and optimal Debt Matrix) in the center of the Group Page.
- **Rationale**:
  - Tabbed isolation reduces cognitive overload, allows page components to query data independently, and provides a polished interface.
