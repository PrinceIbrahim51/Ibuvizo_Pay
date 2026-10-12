package com.ibuvio.pay.payment;

import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ibuvio.pay.common.InputRules;
import com.ibuvio.pay.payment.PaymentDtos.Contact;
import com.ibuvio.pay.payment.PaymentDtos.CreateMoneyRequest;
import com.ibuvio.pay.payment.PaymentDtos.MoneyRequestResponse;
import com.ibuvio.pay.payment.PaymentDtos.MonthSummary;
import com.ibuvio.pay.payment.PaymentDtos.PayRequest;
import com.ibuvio.pay.payment.PaymentDtos.TransactionResponse;
import com.ibuvio.pay.security.CurrentUser;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;

@RestController
@RequestMapping("/api/v1")
@Validated
public class PaymentController {

    private final PaymentService service;

    public PaymentController(PaymentService service) {
        this.service = service;
    }

    /** Idempotency-Key header is mandatory so network retries can never create a duplicate payment. */
    @PostMapping("/payments")
    @ResponseStatus(HttpStatus.CREATED)
    public TransactionResponse pay(
            @RequestHeader("Idempotency-Key") @Pattern(regexp = InputRules.IDEMPOTENCY_KEY) String idempotencyKey,
            @Valid @RequestBody PayRequest req) {
        return service.pay(CurrentUser.id(), req, idempotencyKey);
    }

    @GetMapping("/payments")
    public Page<TransactionResponse> history(
            @RequestParam(defaultValue = "ALL") @Pattern(regexp = "^(ALL|SENT|RECEIVED|PENDING)$") String filter,
            @RequestParam(required = false) @Pattern(regexp = InputRules.SAFE_TEXT) String q,
            @RequestParam(defaultValue = "0") @Min(0) @Max(10000) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return service.history(CurrentUser.id(), filter, q, page, size);
    }

    @GetMapping("/payments/{id}")
    public TransactionResponse get(@PathVariable UUID id) {
        return service.get(CurrentUser.id(), id);
    }

    @GetMapping("/payments/summary")
    public MonthSummary summary(@RequestParam(required = false) @Pattern(regexp = "^\\d{4}-\\d{2}$") String month) {
        YearMonth ym = month == null ? YearMonth.now(com.ibuvio.pay.common.Clock.IST) : YearMonth.parse(month);
        return service.monthSummary(CurrentUser.id(), ym);
    }

    @GetMapping("/contacts/recent")
    public List<Contact> recentContacts() {
        return service.recentContacts(CurrentUser.id());
    }

    @PostMapping("/requests")
    @ResponseStatus(HttpStatus.CREATED)
    public MoneyRequestResponse request(@Valid @RequestBody CreateMoneyRequest req) {
        return service.requestMoney(CurrentUser.id(), req);
    }

    @GetMapping("/requests/incoming")
    public List<MoneyRequestResponse> incoming() {
        return service.incoming(CurrentUser.id());
    }

    @GetMapping("/requests/outgoing")
    public List<MoneyRequestResponse> outgoing() {
        return service.outgoing(CurrentUser.id());
    }

    @PostMapping("/requests/{id}/decline")
    public MoneyRequestResponse decline(@PathVariable UUID id) {
        return service.decline(CurrentUser.id(), id);
    }
}
