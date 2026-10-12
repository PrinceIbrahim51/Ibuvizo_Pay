package com.ibuvio.pay.admin;

import java.time.Instant;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.ibuvio.pay.audit.AuditLog;
import com.ibuvio.pay.audit.AuditLogRepository;
import com.ibuvio.pay.audit.AuditService;
import com.ibuvio.pay.auth.RefreshTokenRepository;
import com.ibuvio.pay.common.ApiException;
import com.ibuvio.pay.security.CurrentUser;
import com.ibuvio.pay.user.KycStatus;
import com.ibuvio.pay.user.User;
import com.ibuvio.pay.user.UserRepository;
import com.ibuvio.pay.user.UserStatus;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/**
 * Protected three ways: URL rule (hasRole ADMIN) in SecurityConfig, @PreAuthorize here (defence in depth),
 * and the optional ADMIN_ALLOWED_IPS allowlist. The ADMIN role can only be granted directly in the database
 * (see docs/SECURITY.md), never through the API. Every action is audited.
 */
@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
@Validated
public class AdminController {

    private final UserRepository users;
    private final AuditLogRepository auditLogs;
    private final AuditService audit;
    private final RefreshTokenRepository refreshTokens;

    public AdminController(UserRepository users, AuditLogRepository auditLogs, AuditService audit,
                           RefreshTokenRepository refreshTokens) {
        this.users = users;
        this.auditLogs = auditLogs;
        this.audit = audit;
        this.refreshTokens = refreshTokens;
    }

    public record AdminUserView(UUID id, String maskedPhone, String fullName, String vpa, String status,
                                String kycStatus, String role, Instant createdAt) {
        static AdminUserView from(User u) {
            String p = u.getPhone();
            return new AdminUserView(u.getId(), p.substring(0, 3) + "******" + p.substring(p.length() - 4),
                    u.getFullName(), u.getVpa(), u.getStatus().name(), u.getKycStatus().name(), u.getRole().name(),
                    u.getCreatedAt());
        }
    }

    public record AuditView(UUID id, UUID actorId, String action, String detail, String ip, Instant createdAt) {
        static AuditView from(AuditLog a) {
            return new AuditView(a.getId(), a.getActorId(), a.getAction(), a.getDetail(), a.getIp(), a.getCreatedAt());
        }
    }

    public record KycRequest(@NotNull KycStatus status) {}

    public record Stats(long users) {}

    @GetMapping("/users")
    public Page<AdminUserView> users(@RequestParam(required = false) @Pattern(regexp = "^\\d{4,10}$") String phone,
                                     @RequestParam(defaultValue = "0") @Min(0) int page,
                                     @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        PageRequest pr = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<User> result = phone == null ? users.findAll(pr) : users.findByPhoneContaining(phone, pr);
        audit.record(CurrentUser.id(), "ADMIN_LIST_USERS", null);
        return result.map(AdminUserView::from);
    }

    @PostMapping("/users/{id}/freeze")
    @Transactional
    public AdminUserView freeze(@PathVariable UUID id) {
        if (id.equals(CurrentUser.id())) {
            throw ApiException.badRequest("SELF_ACTION", "Admins cannot freeze themselves");
        }
        User u = users.findById(id).orElseThrow(ApiException::notFound);
        u.setStatus(UserStatus.FROZEN);
        u.revokeAllTokens();
        refreshTokens.revokeAllForUser(id);
        audit.record(CurrentUser.id(), "ADMIN_FREEZE", "user " + id);
        return AdminUserView.from(u);
    }

    @PostMapping("/users/{id}/unfreeze")
    @Transactional
    public AdminUserView unfreeze(@PathVariable UUID id) {
        User u = users.findById(id).orElseThrow(ApiException::notFound);
        u.setStatus(UserStatus.ACTIVE);
        audit.record(CurrentUser.id(), "ADMIN_UNFREEZE", "user " + id);
        return AdminUserView.from(u);
    }

    @PostMapping("/users/{id}/kyc")
    @Transactional
    public AdminUserView kyc(@PathVariable UUID id, @Valid @RequestBody KycRequest req) {
        User u = users.findById(id).orElseThrow(ApiException::notFound);
        u.setKycStatus(req.status());
        audit.record(CurrentUser.id(), "ADMIN_KYC", "user " + id + " -> " + req.status());
        return AdminUserView.from(u);
    }

    @GetMapping("/audit")
    public Page<AuditView> audit(@RequestParam(required = false) UUID actorId,
                                 @RequestParam(defaultValue = "0") @Min(0) int page,
                                 @RequestParam(defaultValue = "50") @Min(1) @Max(200) int size) {
        PageRequest pr = PageRequest.of(page, size);
        Page<AuditLog> logs = actorId == null ? auditLogs.findAllByOrderByCreatedAtDesc(pr)
                : auditLogs.findByActorIdOrderByCreatedAtDesc(actorId, pr);
        return logs.map(AuditView::from);
    }

    @GetMapping("/stats")
    public Stats stats() {
        return new Stats(users.count());
    }
}
