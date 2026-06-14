export enum GroupRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER'
}

export enum SplitMethod {
  EQUAL = 'EQUAL',
  UNEQUAL = 'UNEQUAL',
  PERCENTAGE = 'PERCENTAGE',
  SHARE = 'SHARE'
}

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  members?: GroupMember[];
  expenses?: Expense[];
  settlements?: Settlement[];
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: GroupRole;
  isActive: boolean;
  joinedAt: string;
  user?: User;
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  date: string;
  paidById: string;
  createdById: string;
  splitMethod: SplitMethod;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  paidBy?: User;
  createdBy?: User;
  participants?: ExpenseParticipant[];
}

export interface ExpenseParticipant {
  id: string;
  expenseId: string;
  userId: string;
  amountOwed: number;
  shareValue?: number | null;
  createdAt: string;
  user?: User;
}

export interface Settlement {
  id: string;
  groupId: string;
  payerId: string;
  payeeId: string;
  amount: number;
  note?: string | null;
  paymentMethod: string;
  createdAt: string;
  payer?: User;
  payee?: User;
}

export interface ChatMessage {
  id: string;
  expenseId: string;
  senderId: string;
  content: string | null;
  createdAt: string;
  deletedAt?: string | null;
  sender?: User;
}

export interface RefreshToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface Balance {
  userId: string;
  name: string;
  netBalance: number; // positive means owed, negative means owes
}

export interface SimplifiedDebt {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

export interface GroupBalancesResponse {
  simplified: SimplifiedDebt[];
  raw: {
    fromId: string;
    fromName: string;
    toId: string;
    toName: string;
    amount: number;
    expenseId?: string;
    description?: string;
  }[];
  individualSummary: Record<string, number>;
}
