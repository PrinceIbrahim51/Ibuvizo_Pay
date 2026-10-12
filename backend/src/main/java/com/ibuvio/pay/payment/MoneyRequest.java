package com.ibuvio.pay.payment;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** "Request money" (UPI collect). The payer must approve and enter their UPI PIN; nothing is pulled automatically. */
@Entity
@Table(name = "money_requests")
public class MoneyRequest {

    public enum Status { PENDING, PAID, DECLINED, EXPIRED }

    @Id
    private UUID id;

    @Column(name = "requester_id", nullable = false)
    private UUID requesterId;

    @Column(name = "payer_id", nullable = false)
    private UUID payerId;

    @Column(name = "amount_paise", nullable = false)
    private long amountPaise;

    private String note;

    @Column(nullable = false)
    @jakarta.persistence.Enumerated(jakarta.persistence.EnumType.STRING)
    private Status status = Status.PENDING;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected MoneyRequest() {}

    public MoneyRequest(UUID requesterId, UUID payerId, long amountPaise, String note, Instant expiresAt) {
        this.id = UUID.randomUUID();
        this.requesterId = requesterId;
        this.payerId = payerId;
        this.amountPaise = amountPaise;
        this.note = note;
        this.expiresAt = expiresAt;
        this.createdAt = Instant.now();
    }

    public boolean isOpen() {
        return status == Status.PENDING && expiresAt.isAfter(Instant.now());
    }

    public UUID getId() { return id; }
    public UUID getRequesterId() { return requesterId; }
    public UUID getPayerId() { return payerId; }
    public long getAmountPaise() { return amountPaise; }
    public String getNote() { return note; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
    public Instant getExpiresAt() { return expiresAt; }
    public Instant getCreatedAt() { return createdAt; }
}
