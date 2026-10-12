package com.ibuvio.pay.audit;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "audit_logs")
public class AuditLog {

    @Id
    private UUID id;

    @Column(name = "actor_id")
    private UUID actorId;

    @Column(nullable = false)
    private String action;

    private String detail;

    private String ip;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected AuditLog() {}

    public AuditLog(UUID actorId, String action, String detail, String ip) {
        this.id = UUID.randomUUID();
        this.actorId = actorId;
        this.action = action;
        this.detail = detail;
        this.ip = ip;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getActorId() { return actorId; }
    public String getAction() { return action; }
    public String getDetail() { return detail; }
    public String getIp() { return ip; }
    public Instant getCreatedAt() { return createdAt; }
}
