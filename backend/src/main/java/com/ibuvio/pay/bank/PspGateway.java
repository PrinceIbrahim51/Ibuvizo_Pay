package com.ibuvio.pay.bank;

/**
 * Boundary to the Payment Service Provider (the NPCI-certified sponsor bank).
 *
 * SANDBOX: {@link SandboxPspGateway} simulates balances and UPI PINs in the local database so the
 * whole app can be exercised end to end with fake money.
 *
 * LIVE: replace with an implementation of your PSP bank's UPI APIs. In live UPI the UPI PIN is
 * encrypted on the device by NPCI's Common Library and verified by the issuing bank, so
 * {@link #verifyUpiPin} becomes a pass-through of the encrypted credential block.
 */
public interface PspGateway {

    void setUpiPin(BankAccount account, String pin);

    /** Throws when the PIN is wrong or blocked. Failure counters must be persisted by the caller's transaction. */
    void verifyUpiPin(BankAccount account, String pin);

    long balancePaise(BankAccount account);

    void debit(BankAccount account, long paise);

    void credit(BankAccount account, long paise);
}
