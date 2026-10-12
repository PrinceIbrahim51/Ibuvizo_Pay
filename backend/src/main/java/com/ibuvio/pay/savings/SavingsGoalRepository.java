package com.ibuvio.pay.savings;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SavingsGoalRepository extends JpaRepository<SavingsGoal, UUID> {

    List<SavingsGoal> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<SavingsGoal> findByIdAndUserId(UUID id, UUID userId);

    Optional<SavingsGoal> findFirstByUserIdAndActiveTrueOrderByCreatedAtDesc(UUID userId);

    long countByUserIdAndActiveTrue(UUID userId);
}
