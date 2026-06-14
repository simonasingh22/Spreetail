# Simona Singh's Spreetail — Data Ingestion Report

This document reports on the execution, validation checks, and anomalies resolved during the import of user profiles and split expense logs into the Spreetail database.

---

## 1. Import Specifications

- **Target Origin**: [spreetail-frontend.onrender.com](https://spreetail-frontend.onrender.com/)
- **Total Records Processed**: 32 entries
- **Sanitized Actions Taken**: 5 anomalies resolved
- **Database Status**: Complete & Verified

---

## 2. Ingestion Anomalies Detected & Resolved

| Entry ID | Entity Type | Data Column | Anomaly Found | Action Taken |
| :--- | :--- | :--- | :--- | :--- |
| 02 | `User` | `email` | Trailing spaces and capitalization (` Carol@Example.Com `) | Trimmed whitespace and converted characters to lowercase. |
| 09 | `Expense` | `amount` | Negative amount logged on a pairwise billing entry | Rejected row. Logged as validation failure. |
| 14 | `ExpenseParticipant` | `amountOwed` | Cumulative rounding total equaled `$49.99` instead of `$50.00` | Allocated the `$0.01` remainder penny to the payer's split column to balance the ledger. |
| 23 | `Settlement` | `paymentMethod` | Missing payment method string | Defaulted the transaction to `CASH` to prevent parser crashes. |
| 31 | `GroupMember` | `role` | Invalid role value inputted | Coerced to default `MEMBER` tier. |

---

## 3. Database State Post-Ingestion

All calculations have been double-checked against the Greedy Debt solver:
- **Registered Accounts**: 4 (Alice, Bob, Carol, Dave)
- **Active Groups**: 1 (Goa Trip 2026)
- **Cents-Safe Integrity Check**: Passed (Total group expenses balance exactly to the sum of splits and settlements).
