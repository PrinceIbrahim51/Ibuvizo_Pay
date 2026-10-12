package com.ibuvio.pay.bank;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name = "bank_accounts")
public class BankAccount {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "bank_code", nullable = false)
    private String bankCode;

    @Column(name = "bank_name", nullable = false)
    private String bankName;

    @Column(name = "account_type", nullable = false)
    private String accountType;

    /** AES-256-GCM encrypted. Only the last 4 digits are ever returned by the API. */
    @Column(name = "account_number_enc", nullable = false)
    private String accountNumberEnc;

    @Column(name = "account_last4", nullable = false)
    private String accountLast4;

    @Column(nullable = false)
    private String ifsc;

    /** Sandbox only. In live UPI the PIN is captured by NPCI's Common Library and never reaches this server. */
    @Column(name = "upi_pin_hash")
    private String upiPinHash;

    @Column(name = "pin_failures", nullable = false)
    private int pinFailures;

    @Column(name = "pin_blocked_until")
    private Instant pinBlockedUntil;

    @Column(name = "is_primary", nullable = false)
    private boolean primary;

    @Column(name = "sandbox_balance_paise", nullable = false)
    private long sandboxBalancePaise;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Version
    private long version;

    protected BankAccount() {}

    public BankAccount(UUID userId, String bankCode, String bankName, String accountType, String accountNumberEnc,
                       String accountLast4, String ifsc) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.bankCode = bankCode;
        this.bankName = bankName;
        this.accountType = accountType;
        this.accountNumberEnc = accountNumberEnc;
        this.accountLast4 = accountLast4;
        this.ifsc = ifsc;
        this.createdAt = Instant.now();
    }

    public boolean isPinBlocked() {
        return pinBlockedUntil != null && pinBlockedUntil.isAfter(Instant.now());
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getBankCode() { return bankCode; }
    public String getBankName() { return bankName; }
    public String getAccountType() { return accountType; }
    public String getAccountNumberEnc() { return accountNumberEnc; }
    public String getAccountLast4() { return accountLast4; }
    public String getIfsc() { return ifsc; }
    public String getUpiPinHash() { return upiPinHash; }
    public void setUpiPinHash(String upiPinHash) { this.upiPinHash = upiPinHash; }
    public int getPinFailures() { return pinFailures; }
    public void setPinFailures(int pinFailures) { this.pinFailures = pinFailures; }
    public Instant getPinBlockedUntil() { return pinBlockedUntil; }
    public void setPinBlockedUntil(Instant pinBlockedUntil) { this.pinBlockedUntil = pinBlockedUntil; }
    public boolean isPrimary() { return primary; }
    public void setPrimary(boolean primary) { this.primary = primary; }
    public long getSandboxBalancePaise() { return sandboxBalancePaise; }
    public void setSandboxBalancePaise(long sandboxBalancePaise) { this.sandboxBalancePaise = sandboxBalancePaise; }
    public Instant getCreatedAt() { return createdAt; }
}
