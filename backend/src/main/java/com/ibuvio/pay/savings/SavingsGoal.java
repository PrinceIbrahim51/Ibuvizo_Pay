package com.ibuvio.pay.savings;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name = "savings_goals")
public class SavingsGoal {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String name;

    private String emoji;

    @Column(name = "target_paise", nullable = false)
    private long targetPaise;

    @Column(name = "saved_paise", nullable = false)
    private long savedPaise;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Version
    private long version;

    protected SavingsGoal() {}

    public SavingsGoal(UUID userId, String name, String emoji, long targetPaise) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.name = name;
        this.emoji = emoji;
        this.targetPaise = targetPaise;
        this.createdAt = Instant.now();
    }

    public void add(long paise) {
        savedPaise = Math.addExact(savedPaise, paise);
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getName() { return name; }
    public String getEmoji() { return emoji; }
    public long getTargetPaise() { return targetPaise; }
    public long getSavedPaise() { return savedPaise; }
    public void setSavedPaise(long savedPaise) { this.savedPaise = savedPaise; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public Instant getCreatedAt() { return createdAt; }
}
