package com.ibuvio.pay.payment;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** A row in one user's passbook. A transfer between two IBUVIO users creates a DEBIT row and a CREDIT row. */
@Entity
@Table(name = "transactions")
public class Transaction {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Direction direction;

    @Column(name = "counterparty_name", nullable = false)
    private String counterpartyName;

    @Column(name = "counterparty_vpa", nullable = false)
    private String counterpartyVpa;

    @Column(name = "counterparty_user")
    private UUID counterpartyUser;

    @Column(name = "bank_account_id")
    private UUID bankAccountId;

    @Column(name = "amount_paise", nullable = false)
    private long amountPaise;

    @Column(name = "round_up_paise", nullable = false)
    private long roundUpPaise;

    private String note;

    @Column(nullable = false)
    private String category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Channel channel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TxnStatus status;

    @Column(name = "upi_ref", nullable = false)
    private String upiRef;

    @Column(name = "idempotency_key")
    private String idempotencyKey;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Transaction() {}

    public Transaction(UUID userId, Direction direction, String counterpartyName, String counterpartyVpa,
                       UUID counterpartyUser, UUID bankAccountId, long amountPaise, String note, String category,
                       Channel channel, TxnStatus status, String upiRef, String idempotencyKey) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.direction = direction;
        this.counterpartyName = counterpartyName;
        this.counterpartyVpa = counterpartyVpa;
        this.counterpartyUser = counterpartyUser;
        this.bankAccountId = bankAccountId;
        this.amountPaise = amountPaise;
        this.note = note;
        this.category = category;
        this.channel = channel;
        this.status = status;
        this.upiRef = upiRef;
        this.idempotencyKey = idempotencyKey;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public Direction getDirection() { return direction; }
    public String getCounterpartyName() { return counterpartyName; }
    public String getCounterpartyVpa() { return counterpartyVpa; }
    public UUID getCounterpartyUser() { return counterpartyUser; }
    public UUID getBankAccountId() { return bankAccountId; }
    public long getAmountPaise() { return amountPaise; }
    public long getRoundUpPaise() { return roundUpPaise; }
    public void setRoundUpPaise(long roundUpPaise) { this.roundUpPaise = roundUpPaise; }
    public String getNote() { return note; }
    public String getCategory() { return category; }
    public Channel getChannel() { return channel; }
    public TxnStatus getStatus() { return status; }
    public String getUpiRef() { return upiRef; }
    public Instant getCreatedAt() { return createdAt; }
}
