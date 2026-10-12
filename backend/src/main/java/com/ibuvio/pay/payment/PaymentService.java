package com.ibuvio.pay.payment;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ibuvio.pay.audit.AuditService;
import com.ibuvio.pay.bank.BankAccount;
import com.ibuvio.pay.bank.BankAccountRepository;
import com.ibuvio.pay.bank.PspGateway;
import com.ibuvio.pay.common.ApiException;
import com.ibuvio.pay.common.Clock;
import com.ibuvio.pay.common.InputRules;
import com.ibuvio.pay.config.AppProperties;
import com.ibuvio.pay.payment.PaymentDtos.Contact;
import com.ibuvio.pay.payment.PaymentDtos.CreateMoneyRequest;
import com.ibuvio.pay.payment.PaymentDtos.MoneyRequestResponse;
import com.ibuvio.pay.payment.PaymentDtos.MonthSummary;
import com.ibuvio.pay.payment.PaymentDtos.PayRequest;
import com.ibuvio.pay.payment.PaymentDtos.TransactionResponse;
import com.ibuvio.pay.savings.RoundUp;
import com.ibuvio.pay.savings.SavingsGoal;
import com.ibuvio.pay.savings.SavingsGoalRepository;
import com.ibuvio.pay.security.CryptoService;
import com.ibuvio.pay.shop.ShopBooks;
import com.ibuvio.pay.user.User;
import com.ibuvio.pay.user.UserRepository;
import com.ibuvio.pay.user.UserStatus;

@Service
public class PaymentService {

    private final UserRepository users;
    private final BankAccountRepository accounts;
    private final TransactionRepository txns;
    private final MoneyRequestRepository requests;
    private final SavingsGoalRepository goals;
    private final PspGateway psp;
    private final ShopBooks books;
    private final CryptoService crypto;
    private final AuditService audit;
    private final AppProperties.Limits limits;

    public PaymentService(UserRepository users, BankAccountRepository accounts, TransactionRepository txns,
                          MoneyRequestRepository requests, SavingsGoalRepository goals, PspGateway psp,
                          ShopBooks books, CryptoService crypto, AuditService audit, AppProperties props) {
        this.users = users;
        this.accounts = accounts;
        this.txns = txns;
        this.requests = requests;
        this.goals = goals;
        this.psp = psp;
        this.books = books;
        this.crypto = crypto;
        this.audit = audit;
        this.limits = props.limits();
    }

    /**
     * Sends money. All validation happens before any balance changes, so the noRollbackFor (needed to persist
     * wrong-PIN counters) can never leave a half-applied transfer behind.
     */
    @Transactional(noRollbackFor = ApiException.class)
    public TransactionResponse pay(UUID payerId, PayRequest req, String idempotencyKey) {
        var existing = txns.findByUserIdAndIdempotencyKey(payerId, idempotencyKey);
        if (existing.isPresent()) {
            return TransactionResponse.from(existing.get()); // safe retry: never charge twice
        }

        User payer = users.findById(payerId).orElseThrow(ApiException::unauthorized);
        if (payer.getStatus() != UserStatus.ACTIVE) {
            throw ApiException.forbidden();
        }
        long amount = req.amountPaise();
        if (amount <= 0 || amount > limits.perTransactionPaise()) {
            throw ApiException.badRequest("AMOUNT_LIMIT", "Amount is above the per-transaction limit");
        }
        if (payer.getVpa().equalsIgnoreCase(req.payeeVpa())) {
            throw ApiException.badRequest("SELF_PAYMENT", "You cannot pay yourself");
        }
        checkDailyLimits(payer, amount);

        MoneyRequest moneyRequest = null;
        if (req.moneyRequestId() != null) {
            moneyRequest = requests.findByIdAndPayerId(req.moneyRequestId(), payerId).orElseThrow(ApiException::notFound);
            if (!moneyRequest.isOpen() || moneyRequest.getAmountPaise() != amount) {
                throw ApiException.badRequest("REQUEST_CLOSED", "This request is no longer payable");
            }
        }

        User payee = users.findByVpaIgnoreCase(req.payeeVpa()).orElse(null);
        if (payee != null && payee.getStatus() != UserStatus.ACTIVE) {
            throw ApiException.badRequest("PAYEE_UNAVAILABLE", "This UPI ID cannot receive money right now");
        }
        if (moneyRequest != null && (payee == null || !payee.getId().equals(moneyRequest.getRequesterId()))) {
            throw ApiException.badRequest("REQUEST_MISMATCH", "Payee does not match the request");
        }

        BankAccount source = req.accountId() != null
                ? accounts.findByIdAndUserId(req.accountId(), payerId).orElseThrow(ApiException::notFound)
                : accounts.findFirstByUserIdAndPrimaryTrue(payerId)
                        .orElseThrow(() -> ApiException.badRequest("NO_ACCOUNT", "Link a bank account first"));
        BankAccount payeeAccount = payee == null ? null
                : accounts.findFirstByUserIdAndPrimaryTrue(payee.getId())
                        .orElseThrow(() -> ApiException.badRequest("PAYEE_NO_ACCOUNT",
                                "This UPI ID has no bank account linked"));

        // Lock both rows in a stable order to avoid deadlocks between two users paying each other.
        BankAccount lockedSource;
        BankAccount lockedPayee = null;
        if (payeeAccount != null && payeeAccount.getId().compareTo(source.getId()) < 0) {
            lockedPayee = accounts.lockById(payeeAccount.getId()).orElseThrow();
            lockedSource = accounts.lockById(source.getId()).orElseThrow();
        } else {
            lockedSource = accounts.lockById(source.getId()).orElseThrow();
            if (payeeAccount != null) {
                lockedPayee = accounts.lockById(payeeAccount.getId()).orElseThrow();
            }
        }

        psp.verifyUpiPin(lockedSource, req.upiPin());
        if (psp.balancePaise(lockedSource) < amount) {
            throw ApiException.badRequest("INSUFFICIENT_FUNDS", "Insufficient balance in the selected account");
        }

        // ---- From here on, state changes. Nothing below throws ApiException for user errors. ----
        psp.debit(lockedSource, amount);
        if (lockedPayee != null) {
            psp.credit(lockedPayee, amount);
        }

        String note = InputRules.clean(req.note());
        String category = req.category() != null ? req.category()
                : req.channel() == Channel.BANK_TRANSFER ? "BANK"
                : payee == null ? "MERCHANT" : "TRANSFER";
        String upiRef = crypto.randomDigits(12);
        String payeeName = payee != null ? payee.getFullName()
                : (req.payeeName() != null ? InputRules.clean(req.payeeName()) : req.payeeVpa());

        Transaction debit = new Transaction(payerId, Direction.DEBIT, payeeName, req.payeeVpa().toLowerCase(),
                payee == null ? null : payee.getId(), lockedSource.getId(), amount, note, category, req.channel(),
                TxnStatus.SUCCESS, upiRef, idempotencyKey);

        long saved = applyRoundUp(payer, lockedSource, amount);
        debit.setRoundUpPaise(saved);
        txns.save(debit);

        if (payee != null) {
            Transaction credit = new Transaction(payee.getId(), Direction.CREDIT, payer.getFullName(), payer.getVpa(),
                    payerId, lockedPayee.getId(), amount, note, "RECEIVED", req.channel(), TxnStatus.SUCCESS, upiRef,
                    null);
            txns.save(credit);
            if (payee.isBusinessMode()) {
                books.recordUpiSale(payee.getId(), amount, note, credit.getId());
            }
        }
        if (payer.isBusinessMode() && Boolean.TRUE.equals(req.businessExpense())) {
            int gst = req.gstRate() == null ? 0 : req.gstRate();
            books.recordUpiExpense(payerId, amount, gst, "PURCHASES", note, debit.getId());
        }
        if (moneyRequest != null) {
            moneyRequest.setStatus(MoneyRequest.Status.PAID);
        }
        audit.record(payerId, "PAYMENT", "ref " + upiRef + " paise " + amount);
        return TransactionResponse.from(debit);
    }

    private void checkDailyLimits(User payer, long amount) {
        Instant startOfDay = LocalDate.now(Clock.IST).atStartOfDay(Clock.IST).toInstant();
        long today = txns.debitedSince(payer.getId(), startOfDay);
        if (today + amount > limits.dailyPaise()) {
            throw ApiException.badRequest("DAILY_LIMIT", "Daily UPI limit reached");
        }
        // Cooling period for new accounts (anti-fraud): small cap during the first 24 hours.
        if (payer.getCreatedAt().isAfter(Instant.now().minus(Duration.ofHours(24)))) {
            long sinceSignup = txns.debitedSince(payer.getId(), payer.getCreatedAt());
            if (sinceSignup + amount > limits.newUserCoolingPaise()) {
                throw ApiException.badRequest("COOLING_LIMIT",
                        "New accounts can send up to Rs " + limits.newUserCoolingPaise() / 100 + " in the first 24 hours");
            }
        }
    }

    /** Smart Savings: moves the spare change to the user's newest active goal when there is enough balance. */
    private long applyRoundUp(User payer, BankAccount source, long amount) {
        if (!payer.isRoundUpEnabled()) {
            return 0;
        }
        SavingsGoal goal = goals.findFirstByUserIdAndActiveTrueOrderByCreatedAtDesc(payer.getId()).orElse(null);
        long spare = RoundUp.spareChange(amount, payer.getRoundUpToRupees());
        if (goal == null || spare == 0 || psp.balancePaise(source) < spare) {
            return 0;
        }
        psp.debit(source, spare);
        goal.add(spare);
        return spare;
    }

    @Transactional(readOnly = true)
    public Page<TransactionResponse> history(UUID userId, String filter, String q, int page, int size) {
        Direction direction = switch (filter == null ? "ALL" : filter) {
            case "SENT" -> Direction.DEBIT;
            case "RECEIVED" -> Direction.CREDIT;
            default -> null;
        };
        TxnStatus status = "PENDING".equals(filter) ? TxnStatus.PENDING : null;
        PageRequest pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 50),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        return txns.findAll(TransactionSpecs.forUser(userId, direction, status, q), pageable)
                .map(TransactionResponse::from);
    }

    @Transactional(readOnly = true)
    public TransactionResponse get(UUID userId, UUID id) {
        return txns.findByIdAndUserId(id, userId).map(TransactionResponse::from).orElseThrow(ApiException::notFound);
    }

    @Transactional(readOnly = true)
    public MonthSummary monthSummary(UUID userId, YearMonth month) {
        Instant from = month.atDay(1).atStartOfDay(Clock.IST).toInstant();
        Instant to = month.plusMonths(1).atDay(1).atStartOfDay(Clock.IST).toInstant();
        Instant prevFrom = month.minusMonths(1).atDay(1).atStartOfDay(Clock.IST).toInstant();
        long spent = txns.total(userId, Direction.DEBIT, from, to);
        long received = txns.total(userId, Direction.CREDIT, from, to);
        long prevSpent = txns.total(userId, Direction.DEBIT, prevFrom, from);
        long prevReceived = txns.total(userId, Direction.CREDIT, prevFrom, from);
        long roundUps = txns.roundUpTotal(userId, from, to);
        return new MonthSummary(spent, received, pct(spent, prevSpent), pct(received, prevReceived), roundUps);
    }

    private static Integer pct(long now, long before) {
        return before == 0 ? null : (int) Math.round((now - before) * 100.0 / before);
    }

    @Transactional(readOnly = true)
    public List<Contact> recentContacts(UUID userId) {
        Map<String, Contact> unique = new LinkedHashMap<>();
        for (Transaction t : txns.findTop50ByUserIdAndDirectionOrderByCreatedAtDesc(userId, Direction.DEBIT)) {
            unique.putIfAbsent(t.getCounterpartyVpa(), new Contact(t.getCounterpartyName(), t.getCounterpartyVpa()));
            if (unique.size() == 10) break;
        }
        return new ArrayList<>(unique.values());
    }

    // ---------- Request money ----------

    @Transactional
    public MoneyRequestResponse requestMoney(UUID requesterId, CreateMoneyRequest req) {
        User requester = users.findById(requesterId).orElseThrow(ApiException::unauthorized);
        User payer = users.findByVpaIgnoreCase(req.payerVpa())
                .filter(u -> u.getStatus() == UserStatus.ACTIVE)
                .orElseThrow(() -> ApiException.badRequest("VPA_NOT_FOUND", "UPI ID could not be verified"));
        if (payer.getId().equals(requesterId)) {
            throw ApiException.badRequest("SELF_REQUEST", "You cannot request money from yourself");
        }
        if (requests.countByRequesterIdAndStatus(requesterId, MoneyRequest.Status.PENDING) >= 20) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "REQUEST_LIMIT", "Too many open requests");
        }
        MoneyRequest r = requests.save(new MoneyRequest(requesterId, payer.getId(), req.amountPaise(),
                InputRules.clean(req.note()), Instant.now().plus(Duration.ofDays(7))));
        audit.record(requesterId, "MONEY_REQUESTED", "request " + r.getId());
        return toResponse(r, payer);
    }

    @Transactional(readOnly = true)
    public List<MoneyRequestResponse> incoming(UUID userId) {
        return requests.findTop50ByPayerIdOrderByCreatedAtDesc(userId).stream()
                .map(r -> toResponse(r, users.findById(r.getRequesterId()).orElse(null))).toList();
    }

    @Transactional(readOnly = true)
    public List<MoneyRequestResponse> outgoing(UUID userId) {
        return requests.findTop50ByRequesterIdOrderByCreatedAtDesc(userId).stream()
                .map(r -> toResponse(r, users.findById(r.getPayerId()).orElse(null))).toList();
    }

    @Transactional
    public MoneyRequestResponse decline(UUID userId, UUID requestId) {
        MoneyRequest r = requests.findByIdAndPayerId(requestId, userId).orElseThrow(ApiException::notFound);
        if (r.isOpen()) {
            r.setStatus(MoneyRequest.Status.DECLINED);
        }
        return toResponse(r, users.findById(r.getRequesterId()).orElse(null));
    }

    private static MoneyRequestResponse toResponse(MoneyRequest r, User other) {
        String status = r.getStatus() == MoneyRequest.Status.PENDING && !r.isOpen() ? "EXPIRED" : r.getStatus().name();
        return new MoneyRequestResponse(r.getId(), other == null ? "Unknown" : other.getFullName(),
                other == null ? "" : other.getVpa(), r.getAmountPaise(), r.getNote(), status, r.getExpiresAt(),
                r.getCreatedAt());
    }
}
