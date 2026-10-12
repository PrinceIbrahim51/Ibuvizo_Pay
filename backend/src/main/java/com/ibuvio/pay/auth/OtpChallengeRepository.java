package com.ibuvio.pay.auth;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface OtpChallengeRepository extends JpaRepository<OtpChallenge, UUID> {

    long countByPhoneAndCreatedAtAfter(String phone, Instant after);

    Optional<OtpChallenge> findFirstByPhoneOrderByCreatedAtDesc(String phone);

    @Modifying
    @Query("delete from OtpChallenge o where o.expiresAt < :cutoff")
    int deleteExpired(Instant cutoff);
}
