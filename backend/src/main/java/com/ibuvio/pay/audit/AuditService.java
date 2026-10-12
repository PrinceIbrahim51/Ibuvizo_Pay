package com.ibuvio.pay.audit;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import com.ibuvio.pay.security.ClientIp;

/** Append-only security audit trail. Never log PINs, OTPs, tokens or full account numbers here. */
@Service
public class AuditService {

    private final AuditLogRepository repo;

    public AuditService(AuditLogRepository repo) {
        this.repo = repo;
    }

    /** Runs in its own transaction so failed-login records survive the rollback of the failing request. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(UUID actorId, String action, String detail) {
        String ip = null;
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
            ip = ClientIp.of(attrs.getRequest());
        }
        String safeDetail = detail == null ? null : detail.substring(0, Math.min(detail.length(), 255));
        repo.save(new AuditLog(actorId, action, safeDetail, ip));
    }
}
