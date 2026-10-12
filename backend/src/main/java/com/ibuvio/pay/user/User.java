package com.ibuvio.pay.user;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class User {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true)
    private String phone;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    private String email;

    @Column(nullable = false, unique = true)
    private String vpa;

    @Column(name = "mpin_hash", nullable = false)
    private String mpinHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role = Role.USER;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserStatus status = UserStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    @Column(name = "kyc_status", nullable = false)
    private KycStatus kycStatus = KycStatus.PENDING;

    @Column(name = "token_version", nullable = false)
    private int tokenVersion;

    @Column(name = "failed_logins", nullable = false)
    private int failedLogins;

    @Column(name = "locked_until")
    private Instant lockedUntil;

    @Column(name = "business_mode", nullable = false)
    private boolean businessMode;

    @Column(name = "round_up_enabled", nullable = false)
    private boolean roundUpEnabled;

    @Column(name = "round_up_to_rupees", nullable = false)
    private int roundUpToRupees = 10;

    @Column(name = "preferred_language", nullable = false)
    private String preferredLanguage = "en";

    @Column(name = "notifications_on", nullable = false)
    private boolean notificationsOn = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected User() {}

    public User(String phone, String fullName, String vpa, String mpinHash) {
        this.id = UUID.randomUUID();
        this.phone = phone;
        this.fullName = fullName;
        this.vpa = vpa;
        this.mpinHash = mpinHash;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public boolean isLocked() {
        return lockedUntil != null && lockedUntil.isAfter(Instant.now());
    }

    public void revokeAllTokens() {
        tokenVersion++;
    }

    public UUID getId() { return id; }
    public String getPhone() { return phone; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getVpa() { return vpa; }
    public String getMpinHash() { return mpinHash; }
    public void setMpinHash(String mpinHash) { this.mpinHash = mpinHash; }
    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
    public UserStatus getStatus() { return status; }
    public void setStatus(UserStatus status) { this.status = status; }
    public KycStatus getKycStatus() { return kycStatus; }
    public void setKycStatus(KycStatus kycStatus) { this.kycStatus = kycStatus; }
    public int getTokenVersion() { return tokenVersion; }
    public int getFailedLogins() { return failedLogins; }
    public void setFailedLogins(int failedLogins) { this.failedLogins = failedLogins; }
    public Instant getLockedUntil() { return lockedUntil; }
    public void setLockedUntil(Instant lockedUntil) { this.lockedUntil = lockedUntil; }
    public boolean isBusinessMode() { return businessMode; }
    public void setBusinessMode(boolean businessMode) { this.businessMode = businessMode; }
    public boolean isRoundUpEnabled() { return roundUpEnabled; }
    public void setRoundUpEnabled(boolean roundUpEnabled) { this.roundUpEnabled = roundUpEnabled; }
    public int getRoundUpToRupees() { return roundUpToRupees; }
    public void setRoundUpToRupees(int roundUpToRupees) { this.roundUpToRupees = roundUpToRupees; }
    public String getPreferredLanguage() { return preferredLanguage; }
    public void setPreferredLanguage(String preferredLanguage) { this.preferredLanguage = preferredLanguage; }
    public boolean isNotificationsOn() { return notificationsOn; }
    public void setNotificationsOn(boolean notificationsOn) { this.notificationsOn = notificationsOn; }
    public Instant getCreatedAt() { return createdAt; }
}
