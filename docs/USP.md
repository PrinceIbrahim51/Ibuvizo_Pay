# IBUVIO: product USP

## Chosen positioning (built in this repo)

> **"UPI for Small Shops + Auto Accounting + Voice in Local Language"**
> plus **Smart Savings (round-up)** for everyday users.

| USP | What's implemented | Where |
|---|---|---|
| **UPI for Small Shops: zero-setup business mode** | Shop profile (name, GSTIN, type, default GST). Every UPI payment a shop receives is **auto-booked** as a sale; business payments can be booked as expenses. Daily profit/loss, 7-day chart, entries list. | `backend/.../shop`, `mobile/src/app/(app)/shop` |
| **GST-ready reports** | Monthly GSTR-3B-style summary per rate (taxable value, CGST/SGST, output tax − input tax credit), plus a ledger CSV export that is safe against CSV/formula injection. | `ShopService.gst`, `/shop/reports/ledger.csv`, `shop/gst.tsx` |
| **Voice UPI in Tamil / Hindi / Telugu / English** | "Amma-ku ₹500 anuppu", "Rahul ko 500 bhejo", "ஐநூறு ரூபாய் விற்பனை", "800 का माल खरीदा". The phone's speech recogniser turns speech into text; the backend parser handles number words in all four languages, case endings (‑ku / ‑க்கு / ko / కి) and family words (அம்மா → Amma), and matches the payee against recent contacts. **Nothing executes automatically**: payments still need the UPI PIN. | `backend/.../voice`, `mobile/src/app/(app)/voice.tsx` |
| **Smart Savings UPI** | Round-up to ₹10/₹50/₹100 on every payment; spare change moves into the newest active goal (bike, phone, trip…). Withdraw back to the bank anytime. | `RoundUp`, `SavingsService`, `savings.tsx` |
| Request money / Bank transfer | UPI collect-style requests (payer approves with PIN) and account + IFSC transfers via `account@IFSC.ifsc.npci`. | `PaymentService`, `request.tsx`, `bank-transfer.tsx` |

### Why this combo wins
* Kirana stores hate complexity. Payments **are** the bookkeeping, with no second app.
* Voice in the shopkeeper's own language removes the literacy/typing barrier.
* GST summaries are a reason to keep using the app, not just to receive money.
* Round-up savings gives consumers a daily habit and a "sticky" reason to choose IBUVIO.

## Roadmap: the other USP ideas

| # | Idea | Fit with current architecture | Notes |
|---|---|---|---|
| 1 | Smart Savings (round-up) | ✅ **Built** | Next: move savings to a regulated product (RD/liquid fund) via a partner. |
| 2 | Credit Builder (CIBIL) | Needs NBFC + credit bureau membership | Repayment history from `transactions` can feed bureau reporting once licensed. |
| 3 | Offline UPI (SMS / USSD *99#) | Needs NPCI/USSD gateway partner | UPI Lite / *99# can be added as a new `PspGateway` channel. |
| 4 | Split bills on steroids | Easy next step | Builds on `money_requests`: one request per friend + reminders. |
| 5 | UPI for couples | Medium | Shared savings goal = `savings_goals` with multiple members. |
| 6 | Small shops + GST | ✅ **Built** | Next: inventory, credit (udhaar) book with SMS reminders. |
| 7 | Cashback brain (AI offers) | Needs offer partners | Can rank offers at the Send screen before PIN entry. |
| 8 | Family UPI (parental controls) | Medium | Add per-user limits and category blocks to `PaymentService.checkDailyLimits` (UPI Circle). |
| 9 | Voice UPI | ✅ **Built** (TA/HI/TE/EN) | Next: more languages (Kannada, Malayalam, Bengali, Marathi). |
| 10 | Emergency mode | Medium | Trusted-circle quick requests on top of `money_requests`. |

## Important reality check
Moving real money over UPI requires partnering with an **NPCI-certified PSP (sponsor) bank** and passing NPCI
certification. This repo runs end-to-end in **sandbox mode** (simulated balances). Going live means
implementing `PspGateway` against your sponsor bank's APIs and using NPCI's Common Library for UPI PIN entry.
