package com.ibuvio.pay.bank;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ibuvio.pay.bank.BankDtos.AccountResponse;
import com.ibuvio.pay.bank.BankDtos.BalanceResponse;
import com.ibuvio.pay.bank.BankDtos.BankOption;
import com.ibuvio.pay.bank.BankDtos.ChangePinRequest;
import com.ibuvio.pay.bank.BankDtos.LinkAccountRequest;
import com.ibuvio.pay.bank.BankDtos.PinRequest;
import com.ibuvio.pay.security.CurrentUser;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/accounts")
public class BankController {

    private final BankService service;

    public BankController(BankService service) {
        this.service = service;
    }

    @GetMapping
    public List<AccountResponse> list() {
        return service.list(CurrentUser.id());
    }

    @GetMapping("/banks")
    public List<BankOption> banks() {
        return Arrays.stream(SupportedBank.values()).map(b -> new BankOption(b.name(), b.displayName())).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AccountResponse link(@Valid @RequestBody LinkAccountRequest req) {
        return service.link(CurrentUser.id(), req);
    }

    @PostMapping("/{id}/primary")
    public AccountResponse primary(@PathVariable UUID id) {
        return service.makePrimary(CurrentUser.id(), id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unlink(@PathVariable UUID id) {
        service.unlink(CurrentUser.id(), id);
    }

    /** POST (not GET) so the UPI PIN travels in the body and never ends up in URLs or access logs. */
    @PostMapping("/{id}/balance")
    public BalanceResponse balance(@PathVariable UUID id, @Valid @RequestBody PinRequest req) {
        return new BalanceResponse(id, service.balance(CurrentUser.id(), id, req.upiPin()));
    }

    @PostMapping("/{id}/pin")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePin(@PathVariable UUID id, @Valid @RequestBody ChangePinRequest req) {
        service.changePin(CurrentUser.id(), id, req.currentPin(), req.newPin());
    }
}
