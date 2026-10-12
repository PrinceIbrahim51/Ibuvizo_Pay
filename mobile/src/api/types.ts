export type TokenResponse = { accessToken: string; refreshToken: string; expiresIn: number; tokenType: string };

export type Profile = {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  vpa: string;
  kycStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  role: 'USER' | 'ADMIN';
  businessMode: boolean;
  roundUpEnabled: boolean;
  roundUpToRupees: number;
  preferredLanguage: Lang;
  notificationsOn: boolean;
  memberSince: string;
};

export type Lang = 'en' | 'hi' | 'ta' | 'te';

export type BankAccount = {
  id: string;
  bankCode: string;
  bankName: string;
  accountType: string;
  maskedNumber: string;
  ifsc: string;
  primary: boolean;
  upiPinSet: boolean;
};

export type Channel = 'VPA' | 'QR' | 'CONTACT' | 'VOICE' | 'REQUEST' | 'BANK_TRANSFER';

export type Transaction = {
  id: string;
  direction: 'DEBIT' | 'CREDIT';
  counterpartyName: string;
  counterpartyVpa: string;
  amountPaise: number;
  roundUpPaise: number;
  note?: string;
  category: string;
  channel: Channel;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  upiRef: string;
  createdAt: string;
};

export type Page<T> = { content: T[]; page: { size: number; number: number; totalElements: number; totalPages: number } };

export type MonthSummary = {
  spentPaise: number;
  receivedPaise: number;
  spentChangePct?: number;
  receivedChangePct?: number;
  roundUpSavedPaise: number;
};

export type Contact = { name: string; vpa: string };

export type MoneyRequest = {
  id: string;
  counterpartyName: string;
  counterpartyVpa: string;
  amountPaise: number;
  note?: string;
  status: 'PENDING' | 'PAID' | 'DECLINED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
};

export type SavingsGoal = {
  id: string;
  name: string;
  emoji?: string;
  targetPaise: number;
  savedPaise: number;
  active: boolean;
  percent: number;
};

export type ShopProfile = { shopName: string; gstin?: string; category: string; defaultGst: number };

export type LedgerEntry = {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amountPaise: number;
  gstRate: number;
  gstPaise: number;
  category: string;
  paymentMode: 'CASH' | 'UPI' | 'CARD' | 'CREDIT';
  note?: string;
  source: 'UPI' | 'MANUAL' | 'VOICE';
  entryDate: string;
  createdAt: string;
};

export type DailySummary = {
  date: string;
  incomePaise: number;
  expensePaise: number;
  profitPaise: number;
  entries: number;
  incomeByMode: Record<string, number>;
  expenseByCategory: Record<string, number>;
};

export type GstRow = { rate: number; grossPaise: number; taxablePaise: number; gstPaise: number; cgstPaise: number; sgstPaise: number };

export type GstReport = {
  month: string;
  shopName: string;
  gstin?: string;
  outward: GstRow[];
  inward: GstRow[];
  outputTaxPaise: number;
  inputTaxCreditPaise: number;
  netPayablePaise: number;
};

export type VoiceParse = {
  intent: 'PAY' | 'RECORD_SALE' | 'RECORD_EXPENSE' | 'UNKNOWN';
  amountPaise?: number;
  payeeName?: string;
  payeeVpa?: string;
  payeeMatched: boolean;
  category?: string;
  paymentMode?: 'CASH' | 'UPI';
  confirmation: string;
  confidence: number;
};
