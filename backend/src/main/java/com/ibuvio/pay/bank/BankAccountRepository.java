package com.ibuvio.pay.bank;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import jakarta.persistence.LockModeType;

public interface BankAccountRepository extends JpaRepository<BankAccount, UUID> {

    List<BankAccount> findByUserIdOrderByCreatedAtAsc(UUID userId);

    /** Ownership is part of the query: a user can never load another user's account by guessing its id. */
    Optional<BankAccount> findByIdAndUserId(UUID id, UUID userId);

    Optional<BankAccount> findFirstByUserIdAndPrimaryTrue(UUID userId);

    long countByUserId(UUID userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from BankAccount b where b.id = :id")
    Optional<BankAccount> lockById(UUID id);
}
