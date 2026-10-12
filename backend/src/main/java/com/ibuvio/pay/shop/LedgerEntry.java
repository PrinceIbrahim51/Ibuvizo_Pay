package com.ibuvio.pay.shop;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** One line in the shop's books. Amounts are GST-inclusive, as recorded at the counter. */
@Entity
@Table(name = "ledger_entries")
public class LedgerEntry {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "entry_type", nullable = false)
    private EntryType type;

    @Column(name = "amount_paise", nullable = false)
    private long amountPaise;

    @Column(name = "gst_rate", nullable = false)
    private int gstRate;

    @Column(nullable = false)
    private String category;

    @Column(name = "payment_mode", nullable = false)
    private String paymentMode;

    private String note;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EntrySource source;

    @Column(name = "transaction_id")
    private UUID transactionId;

    @Column(name = "entry_date", nullable = false)
    private LocalDate entryDate;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected LedgerEntry() {}

    public LedgerEntry(UUID userId, EntryType type, long amountPaise, int gstRate, String category,
                       String paymentMode, String note, EntrySource source, UUID transactionId, LocalDate entryDate) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.type = type;
        this.amountPaise = amountPaise;
        this.gstRate = gstRate;
        this.category = category;
        this.paymentMode = paymentMode;
        this.note = note;
        this.source = source;
        this.transactionId = transactionId;
        this.entryDate = entryDate;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public EntryType getType() { return type; }
    public long getAmountPaise() { return amountPaise; }
    public int getGstRate() { return gstRate; }
    public String getCategory() { return category; }
    public String getPaymentMode() { return paymentMode; }
    public String getNote() { return note; }
    public EntrySource getSource() { return source; }
    public UUID getTransactionId() { return transactionId; }
    public LocalDate getEntryDate() { return entryDate; }
    public Instant getCreatedAt() { return createdAt; }
}
