package com.ibuvio.pay.auth;

import java.text.Normalizer;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ibuvio.pay.audit.AuditService;
import com.ibuvio.pay.auth.AuthDtos.LoginRequest;
import com.ibuvio.pay.auth.AuthDtos.RegisterRequest;
import com.ibuvio.pay.auth.AuthDtos.ResetMpinRequest;
import com.ibuvio.pay.auth.AuthDtos.TokenResponse;
import com.ibuvio.pay.common.ApiException;
import com.ibuvio.pay.common.InputRules;
import com.ibuvio.pay.config.AppProperties;
import com.ibuvio.pay.security.CryptoService;
import com.ibuvio.pay.security.JwtService;
import com.ibuvio.pay.user.User;
import com.ibuvio.pay.user.UserRepository;
import com.ibuvio.pay.user.UserStatus;

@Service
public class AuthService {

    static final int MAX_FAILED_LOGINS = 5;
    static final Duration LOCK_DURATION = Duration.ofMinutes(30);

    /** Pre-computed hash used when the phone is unknown, so response time does not reveal registered numbers. */
    private final String dummyHash;

    private final UserRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final OtpService otpService;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final CryptoService crypto;
    private final AuditService audit;
    private final AppProperties props;

    public AuthService(UserRepository users, RefreshTokenRepository refreshTokens, OtpService otpService,
                       PasswordEncoder encoder, JwtService jwt, CryptoService crypto, AuditService audit,
                       AppProperties props) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.otpService = otpService;
        this.encoder = encoder;
        this.jwt = jwt;
        this.crypto = crypto;
        this.audit = audit;
        this.props = props;
        this.dummyHash = encoder.encode("000000-not-a-real-pin");
    }

    public UUID requestOtp(String phone, OtpPurpose purpose) {
        boolean exists = users.existsByPhone(phone);
        boolean deliver = purpose == OtpPurpose.REGISTER ? !exists : exists;
        return otpService.issue(phone, purpose, deliver);
    }

    @Transactional(noRollbackFor = ApiException.class)
    public TokenResponse register(RegisterRequest req) {
        otpService.verify(req.challengeId(), req.phone(), OtpPurpose.REGISTER, req.otp());
        if (users.existsByPhone(req.phone())) {
            throw ApiException.badRequest("REGISTRATION_FAILED", "Could not create account. Try signing in");
        }
        PinPolicy.requireStrong(req.mpin());
        String name = InputRules.clean(req.fullName());
        User user = new User(req.phone(), name, generateVpa(name), encoder.encode(req.mpin()));
        users.save(user);
        audit.record(user.getId(), "REGISTER", null);
        return issueTokens(user, req.deviceId(), UUID.randomUUID());
    }

    /** Two factors: OTP (possession of the SIM) + MPIN (knowledge). Lockout after repeated MPIN failures. */
    @Transactional(noRollbackFor = ApiException.class)
    public TokenResponse login(LoginRequest req) {
        otpService.verify(req.challengeId(), req.phone(), OtpPurpose.LOGIN, req.otp());
        User user = users.findByPhone(req.phone()).orElse(null);
        if (user == null) {
            encoder.matches(req.mpin(), dummyHash);
            throw badCredentials();
        }
        if (user.isLocked()) {
            throw new ApiException(HttpStatus.LOCKED, "ACCOUNT_LOCKED",
                    "Too many failed attempts. Try again later or reset your MPIN");
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_FROZEN", "This account is frozen. Contact support");
        }
        if (!encoder.matches(req.mpin(), user.getMpinHash())) {
            int failures = user.getFailedLogins() + 1;
            user.setFailedLogins(failures);
            if (failures >= MAX_FAILED_LOGINS) {
                user.setLockedUntil(Instant.now().plus(LOCK_DURATION));
                user.setFailedLogins(0);
                audit.record(user.getId(), "ACCOUNT_LOCKED", "too many MPIN failures");
            }
            audit.record(user.getId(), "LOGIN_FAILED", null);
            throw badCredentials();
        }
        user.setFailedLogins(0);
        user.setLockedUntil(null);
        audit.record(user.getId(), "LOGIN", "device " + req.deviceId());
        return issueTokens(user, req.deviceId(), UUID.randomUUID());
    }

    @Transactional(noRollbackFor = ApiException.class)
    public void resetMpin(ResetMpinRequest req) {
        otpService.verify(req.challengeId(), req.phone(), OtpPurpose.RESET_MPIN, req.otp());
        User user = users.findByPhone(req.phone()).orElseThrow(AuthService::badCredentials);
        PinPolicy.requireStrong(req.newMpin());
        user.setMpinHash(encoder.encode(req.newMpin()));
        user.setFailedLogins(0);
        user.setLockedUntil(null);
        user.revokeAllTokens();
        refreshTokens.revokeAllForUser(user.getId());
        audit.record(user.getId(), "MPIN_RESET", null);
    }

    @Transactional(noRollbackFor = ApiException.class)
    public TokenResponse refresh(String presented, String deviceId) {
        RefreshToken token = refreshTokens.findByTokenHash(crypto.hmac(presented))
                .orElseThrow(ApiException::unauthorized);
        if (token.isRevoked()) {
            // A rotated token was presented again: someone holds a stolen copy. Kill the whole session family.
            refreshTokens.revokeFamily(token.getFamilyId());
            audit.record(token.getUserId(), "REFRESH_REUSE_DETECTED", null);
            throw ApiException.unauthorized();
        }
        if (token.getExpiresAt().isBefore(Instant.now()) || !token.getDeviceId().equals(deviceId)) {
            token.revoke();
            throw ApiException.unauthorized();
        }
        User user = users.findById(token.getUserId()).orElseThrow(ApiException::unauthorized);
        if (user.getStatus() != UserStatus.ACTIVE) {
            token.revoke();
            throw ApiException.unauthorized();
        }
        token.revoke();
        return issueTokens(user, deviceId, token.getFamilyId());
    }

    @Transactional
    public void logout(String presented) {
        refreshTokens.findByTokenHash(crypto.hmac(presented)).ifPresent(t -> refreshTokens.revokeFamily(t.getFamilyId()));
    }

    @Transactional
    public void logoutEverywhere(UUID userId) {
        users.findById(userId).ifPresent(User::revokeAllTokens);
        refreshTokens.revokeAllForUser(userId);
        audit.record(userId, "LOGOUT_ALL", null);
    }

    private TokenResponse issueTokens(User user, String deviceId, UUID familyId) {
        String refresh = crypto.randomToken();
        refreshTokens.save(new RefreshToken(user.getId(), familyId, crypto.hmac(refresh), deviceId,
                Instant.now().plus(props.jwt().refreshTtl())));
        return new TokenResponse(jwt.issueAccessToken(user), refresh, jwt.accessTtlSeconds(), "Bearer");
    }

    /** "Arjun Mehta" -> arjun.mehta@ibuvio, with a numeric suffix when taken. Non-latin names fall back to "user". */
    private String generateVpa(String fullName) {
        String ascii = Normalizer.normalize(fullName, Normalizer.Form.NFD)
                .replaceAll("[^A-Za-z ]", "").trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", ".");
        String base = ascii.length() >= 3 ? ascii.substring(0, Math.min(ascii.length(), 30)) : "user";
        String handle = "@" + props.psp().vpaHandle();
        String candidate = base + handle;
        while (users.existsByVpaIgnoreCase(candidate)) {
            candidate = base + crypto.randomDigits(4) + handle;
        }
        return candidate;
    }

    private static ApiException badCredentials() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Mobile number, OTP or MPIN is incorrect");
    }

    @Scheduled(fixedDelay = 3_600_000)
    @Transactional
    public void purgeExpiredRefreshTokens() {
        refreshTokens.deleteExpired(Instant.now().minus(Duration.ofDays(1)));
    }
}
