package com.ibuvio.pay.savings;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ibuvio.pay.audit.AuditService;
import com.ibuvio.pay.bank.BankAccount;
import com.ibuvio.pay.bank.BankAccountRepository;
import com.ibuvio.pay.bank.PspGateway;
import com.ibuvio.pay.common.ApiException;
import com.ibuvio.pay.common.InputRules;
import com.ibuvio.pay.savings.SavingsDtos.CreateGoalRequest;
import com.ibuvio.pay.savings.SavingsDtos.GoalResponse;

@Service
public class SavingsService {

    static final int MAX_ACTIVE_GOALS = 10;

    private final SavingsGoalRepository goals;
    private final BankAccountRepository accounts;
    private final PspGateway psp;
    private final AuditService audit;

    public SavingsService(SavingsGoalRepository goals, BankAccountRepository accounts, PspGateway psp,
                          AuditService audit) {
        this.goals = goals;
        this.accounts = accounts;
        this.psp = psp;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<GoalResponse> list(UUID userId) {
        return goals.findByUserIdOrderByCreatedAtDesc(userId).stream().map(GoalResponse::from).toList();
    }

    @Transactional
    public GoalResponse create(UUID userId, CreateGoalRequest req) {
        if (goals.countByUserIdAndActiveTrue(userId) >= MAX_ACTIVE_GOALS) {
            throw ApiException.badRequest("GOAL_LIMIT", "You can have up to " + MAX_ACTIVE_GOALS + " active goals");
        }
        SavingsGoal goal = new SavingsGoal(userId, InputRules.clean(req.name()), InputRules.clean(req.emoji()),
                req.targetPaise());
        return GoalResponse.from(goals.save(goal));
    }

    /** Moves the saved amount back to one of the user's own accounts and closes the goal. */
    @Transactional
    public GoalResponse withdraw(UUID userId, UUID goalId, UUID accountId) {
        SavingsGoal goal = goals.findByIdAndUserId(goalId, userId).orElseThrow(ApiException::notFound);
        BankAccount owned = accounts.findByIdAndUserId(accountId, userId).orElseThrow(ApiException::notFound);
        BankAccount locked = accounts.lockById(owned.getId()).orElseThrow(ApiException::notFound);
        long amount = goal.getSavedPaise();
        if (amount > 0) {
            psp.credit(locked, amount);
        }
        goal.setSavedPaise(0);
        goal.setActive(false);
        audit.record(userId, "SAVINGS_WITHDRAWN", "goal " + goalId + " paise " + amount);
        return GoalResponse.from(goal);
    }
}
