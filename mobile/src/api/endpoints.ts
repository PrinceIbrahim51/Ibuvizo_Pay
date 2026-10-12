import { randomUUID } from 'expo-crypto';

import { api } from './client';
import type {
  BankAccount, Channel, Contact, DailySummary, GstReport, Lang, LedgerEntry, MoneyRequest, MonthSummary, Page,
  Profile, SavingsGoal, ShopProfile, TokenResponse, Transaction, VoiceParse,
} from './types';

export const authApi = {
  requestOtp: (phone: string, purpose: 'REGISTER' | 'LOGIN' | 'RESET_MPIN') =>
    api<{ challengeId: string; expiresInSeconds: number }>('/api/v1/auth/otp', {
      method: 'POST', auth: false, body: { phone, purpose },
    }),
  register: (b: { phone: string; challengeId: string; otp: string; fullName: string; mpin: string; deviceId: string }) =>
    api<TokenResponse>('/api/v1/auth/register', { method: 'POST', auth: false, body: b }),
  login: (b: { phone: string; challengeId: string; otp: string; mpin: string; deviceId: string }) =>
    api<TokenResponse>('/api/v1/auth/login', { method: 'POST', auth: false, body: b }),
  resetMpin: (b: { phone: string; challengeId: string; otp: string; newMpin: string }) =>
    api<void>('/api/v1/auth/mpin/reset', { method: 'POST', auth: false, body: b }),
  refresh: (refreshToken: string, deviceId: string) =>
    api<TokenResponse>('/api/v1/auth/refresh', { method: 'POST', auth: false, body: { refreshToken, deviceId } }),
  logout: (refreshToken: string) =>
    api<void>('/api/v1/auth/logout', { method: 'POST', auth: false, body: { refreshToken } }),
  logoutAll: () => api<void>('/api/v1/auth/logout-all', { method: 'POST' }),
};

export const userApi = {
  me: () => api<Profile>('/api/v1/me'),
  update: (b: Partial<{
    fullName: string; email: string; businessMode: boolean; roundUpEnabled: boolean; roundUpToRupees: number;
    preferredLanguage: Lang; notificationsOn: boolean;
  }>) => api<Profile>('/api/v1/me', { method: 'PATCH', body: b }),
  lookupVpa: (vpa: string) =>
    api<{ vpa: string; name: string; onIbuvio: boolean }>(`/api/v1/vpa/${encodeURIComponent(vpa)}`),
};

export const bankApi = {
  list: () => api<BankAccount[]>('/api/v1/accounts'),
  banks: () => api<{ code: string; name: string }[]>('/api/v1/accounts/banks'),
  link: (b: { bankCode: string; accountNumber: string; ifsc: string; accountType: 'SAVINGS' | 'CURRENT'; upiPin: string }) =>
    api<BankAccount>('/api/v1/accounts', { method: 'POST', body: b }),
  makePrimary: (id: string) => api<BankAccount>(`/api/v1/accounts/${id}/primary`, { method: 'POST' }),
  unlink: (id: string) => api<void>(`/api/v1/accounts/${id}`, { method: 'DELETE' }),
  balance: (id: string, upiPin: string) =>
    api<{ accountId: string; balancePaise: number }>(`/api/v1/accounts/${id}/balance`, { method: 'POST', body: { upiPin } }),
  changePin: (id: string, currentPin: string, newPin: string) =>
    api<void>(`/api/v1/accounts/${id}/pin`, { method: 'POST', body: { currentPin, newPin } }),
};

export type PayInput = {
  payeeVpa: string;
  payeeName?: string;
  amountPaise: number;
  note?: string;
  category?: string;
  accountId?: string;
  upiPin: string;
  channel: Channel;
  businessExpense?: boolean;
  gstRate?: number;
  moneyRequestId?: string;
};

export const paymentApi = {
  /** The idempotency key is created once per payment attempt by the caller and reused on retries. */
  pay: (b: PayInput, idempotencyKey: string) =>
    api<Transaction>('/api/v1/payments', { method: 'POST', body: b, idempotencyKey }),
  newIdempotencyKey: () => randomUUID(),
  history: (filter: 'ALL' | 'SENT' | 'RECEIVED' | 'PENDING', q: string, page: number) =>
    api<Page<Transaction>>('/api/v1/payments', { query: { filter, q: q || undefined, page, size: 20 } }),
  get: (id: string) => api<Transaction>(`/api/v1/payments/${id}`),
  summary: (month?: string) => api<MonthSummary>('/api/v1/payments/summary', { query: { month } }),
  recentContacts: () => api<Contact[]>('/api/v1/contacts/recent'),
  request: (b: { payerVpa: string; amountPaise: number; note?: string }) =>
    api<MoneyRequest>('/api/v1/requests', { method: 'POST', body: b }),
  incoming: () => api<MoneyRequest[]>('/api/v1/requests/incoming'),
  outgoing: () => api<MoneyRequest[]>('/api/v1/requests/outgoing'),
  decline: (id: string) => api<MoneyRequest>(`/api/v1/requests/${id}/decline`, { method: 'POST' }),
};

export const savingsApi = {
  list: () => api<SavingsGoal[]>('/api/v1/savings/goals'),
  create: (b: { name: string; emoji?: string; targetPaise: number }) =>
    api<SavingsGoal>('/api/v1/savings/goals', { method: 'POST', body: b }),
  withdraw: (id: string, accountId: string) =>
    api<SavingsGoal>(`/api/v1/savings/goals/${id}/withdraw`, { method: 'POST', body: { accountId } }),
};

export const shopApi = {
  profile: () => api<ShopProfile>('/api/v1/shop/profile'),
  saveProfile: (b: ShopProfile) => api<ShopProfile>('/api/v1/shop/profile', { method: 'PUT', body: b }),
  addEntry: (b: {
    type: 'INCOME' | 'EXPENSE'; amountPaise: number; gstRate: number; category: string;
    paymentMode: 'CASH' | 'UPI' | 'CARD' | 'CREDIT'; note?: string; fromVoice?: boolean;
  }) => api<LedgerEntry>('/api/v1/shop/entries', { method: 'POST', body: b }),
  entries: (date?: string) => api<LedgerEntry[]>('/api/v1/shop/entries', { query: { date } }),
  deleteEntry: (id: string) => api<void>(`/api/v1/shop/entries/${id}`, { method: 'DELETE' }),
  daily: (date?: string) => api<DailySummary>('/api/v1/shop/summary/daily', { query: { date } }),
  range: (from: string, to: string) => api<DailySummary[]>('/api/v1/shop/summary/range', { query: { from, to } }),
  gst: (month: string) => api<GstReport>('/api/v1/shop/reports/gst', { query: { month } }),
};

export const voiceApi = {
  parse: (text: string, language: Lang) =>
    api<VoiceParse>('/api/v1/voice/parse', { method: 'POST', body: { text, language } }),
};
