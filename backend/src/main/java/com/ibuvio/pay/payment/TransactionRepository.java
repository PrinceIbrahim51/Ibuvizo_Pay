package com.ibuvio.pay.payment;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface TransactionRepository extends JpaRepository<Transaction, UUID>, JpaSpecificationExecutor<Transaction> {

    Optional<Transaction> findByUserIdAndIdempotencyKey(UUID userId, String idempotencyKey);

    Optional<Transaction> findByIdAndUserId(UUID id, UUID userId);

    @Query("""
            select coalesce(sum(t.amountPaise + t.roundUpPaise), 0) from Transaction t
            where t.userId = :userId and t.direction = :direction and t.status = com.ibuvio.pay.payment.TxnStatus.SUCCESS
              and t.createdAt >= :from and t.createdAt < :to
            """)
    long total(UUID userId, Direction direction, Instant from, Instant to);

    @Query("""
            select coalesce(sum(t.amountPaise), 0) from Transaction t
            where t.userId = :userId and t.direction = com.ibuvio.pay.payment.Direction.DEBIT and t.status = com.ibuvio.pay.payment.TxnStatus.SUCCESS and t.createdAt >= :from
            """)
    long debitedSince(UUID userId, Instant from);

    @Query("""
            select coalesce(sum(t.roundUpPaise), 0) from Transaction t
            where t.userId = :userId and t.direction = com.ibuvio.pay.payment.Direction.DEBIT and t.createdAt >= :from and t.createdAt < :to
            """)
    long roundUpTotal(UUID userId, Instant from, Instant to);

    List<Transaction> findTop50ByUserIdAndDirectionOrderByCreatedAtDesc(UUID userId, Direction direction);
}
