package com.ibuvio.pay.bank;

import java.time.Duration;
import java.time.Instant;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.ibuvio.pay.auth.PinPolicy;
import com.ibuvio.pay.common.ApiException;

@Component
public class SandboxPspGateway implements PspGateway {

    /** Same rule as banks: 3 wrong UPI PINs blocks the PIN for 24 hours. */
    static final int MAX_PIN_FAILURES = 3;
    static final Duration PIN_BLOCK = Duration.ofHours(24);

    private final PasswordEncoder encoder;

    public SandboxPspGateway(PasswordEncoder encoder) {
        this.encoder = encoder;
    }

    @Override
    public void setUpiPin(BankAccount account, String pin) {
        PinPolicy.requireStrong(pin);
        account.setUpiPinHash(encoder.encode(pin));
        account.setPinFailures(0);
        account.setPinBlockedUntil(null);
    }

    @Override
    public void verifyUpiPin(BankAccount account, String pin) {
        if (account.getUpiPinHash() == null) {
            throw ApiException.badRequest("UPI_PIN_NOT_SET", "Set a UPI PIN for this account first");
        }
        if (account.isPinBlocked()) {
            throw new ApiException(HttpStatus.LOCKED, "UPI_PIN_BLOCKED",
                    "UPI PIN is blocked after too many wrong attempts. Try again after 24 hours or reset it");
        }
        if (!encoder.matches(pin, account.getUpiPinHash())) {
            int failures = account.getPinFailures() + 1;
            account.setPinFailures(failures);
            if (failures >= MAX_PIN_FAILURES) {
                account.setPinBlockedUntil(Instant.now().plus(PIN_BLOCK));
                account.setPinFailures(0);
            }
            throw ApiException.badRequest("UPI_PIN_INCORRECT", "Incorrect UPI PIN");
        }
        account.setPinFailures(0);
    }

    @Override
    public long balancePaise(BankAccount account) {
        return account.getSandboxBalancePaise();
    }

    @Override
    public void debit(BankAccount account, long paise) {
        if (paise <= 0 || account.getSandboxBalancePaise() < paise) {
            throw ApiException.badRequest("INSUFFICIENT_FUNDS", "Insufficient balance in the selected account");
        }
        account.setSandboxBalancePaise(account.getSandboxBalancePaise() - paise);
    }

    @Override
    public void credit(BankAccount account, long paise) {
        account.setSandboxBalancePaise(Math.addExact(account.getSandboxBalancePaise(), paise));
    }
}
