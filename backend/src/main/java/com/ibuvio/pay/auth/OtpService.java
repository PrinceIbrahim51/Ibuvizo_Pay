package com.ibuvio.pay.auth;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ibuvio.pay.common.ApiException;
import com.ibuvio.pay.config.AppProperties;
import com.ibuvio.pay.security.CryptoService;

@Service
public class OtpService {

    private final OtpChallengeRepository repo;
    private final OtpSender sender;
    private final CryptoService crypto;
    private final AppProperties.Otp cfg;

    public OtpService(OtpChallengeRepository repo, OtpSender sender, CryptoService crypto, AppProperties props) {
        this.repo = repo;
        this.sender = sender;
        this.crypto = crypto;
        this.cfg = props.otp();
    }

    @Transactional
    public UUID issue(String phone, OtpPurpose purpose, boolean deliver) {
        Instant now = Instant.now();
        repo.findFirstByPhoneOrderByCreatedAtDesc(phone).ifPresent(last -> {
            if (last.getCreatedAt().plus(cfg.resendCooldown()).isAfter(now)) {
                throw ApiException.tooMany("Please wait before requesting another OTP");
            }
        });
        if (repo.countByPhoneAndCreatedAtAfter(phone, now.minus(Duration.ofHours(1))) >= cfg.maxPerHour()) {
            throw ApiException.tooMany("Too many OTP requests. Try again later");
        }
        UUID id = UUID.randomUUID();
        String code = crypto.randomDigits(6);
        repo.save(new OtpChallenge(id, phone, purpose, crypto.hmac(id + ":" + code), now.plus(cfg.ttl())));
        // When the account state makes this OTP useless (e.g. login for an unknown number) we still create
        // the challenge but do not send it, so responses look identical and phone numbers cannot be enumerated.
        if (deliver) {
            sender.send(phone, code);
        }
        return id;
    }

    /** Verifies and consumes the OTP. Attempt counting is committed even when verification fails. */
    @Transactional(noRollbackFor = ApiException.class)
    public void verify(UUID challengeId, String phone, OtpPurpose purpose, String code) {
        OtpChallenge c = repo.findById(challengeId).orElseThrow(OtpService::invalid);
        if (!c.getPhone().equals(phone) || c.getPurpose() != purpose || c.isConsumed()
                || c.getExpiresAt().isBefore(Instant.now()) || c.getAttempts() >= cfg.maxAttempts()) {
            throw invalid();
        }
        c.incrementAttempts();
        if (!crypto.hmacMatches(challengeId + ":" + code, c.getCodeHash())) {
            throw invalid();
        }
        c.consume();
    }

    private static ApiException invalid() {
        return ApiException.badRequest("OTP_INVALID", "OTP is invalid or expired");
    }

    @Scheduled(fixedDelay = 3_600_000)
    @Transactional
    public void purgeExpired() {
        repo.deleteExpired(Instant.now().minus(Duration.ofDays(1)));
    }
}
