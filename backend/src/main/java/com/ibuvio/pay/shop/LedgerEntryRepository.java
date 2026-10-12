package com.ibuvio.pay.shop;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, UUID> {

    List<LedgerEntry> findByUserIdAndEntryDateOrderByCreatedAtDesc(UUID userId, LocalDate date);

    List<LedgerEntry> findByUserIdAndEntryDateBetweenOrderByEntryDateAscCreatedAtAsc(UUID userId, LocalDate from,
                                                                                    LocalDate to);

    Optional<LedgerEntry> findByIdAndUserId(UUID id, UUID userId);
}
