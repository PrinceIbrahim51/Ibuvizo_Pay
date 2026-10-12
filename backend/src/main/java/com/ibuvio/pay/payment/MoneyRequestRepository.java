package com.ibuvio.pay.payment;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MoneyRequestRepository extends JpaRepository<MoneyRequest, UUID> {

    List<MoneyRequest> findTop50ByPayerIdOrderByCreatedAtDesc(UUID payerId);

    List<MoneyRequest> findTop50ByRequesterIdOrderByCreatedAtDesc(UUID requesterId);

    Optional<MoneyRequest> findByIdAndPayerId(UUID id, UUID payerId);

    long countByRequesterIdAndStatus(UUID requesterId, MoneyRequest.Status status);
}
