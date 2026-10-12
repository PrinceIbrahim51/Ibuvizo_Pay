package com.ibuvio.pay.savings;

import java.util.UUID;

import com.ibuvio.pay.common.InputRules;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class SavingsDtos {

    private SavingsDtos() {}

    public record CreateGoalRequest(
            @NotBlank @Pattern(regexp = InputRules.SAFE_TEXT) @Size(max = 40) String name,
            @Size(max = 8) @Pattern(regexp = "^[^<>\"'`\\\\]*$") String emoji,
            @NotNull @Min(10000) @Max(100000000) Long targetPaise) {}

    public record WithdrawRequest(@NotNull UUID accountId) {}

    public record GoalResponse(UUID id, String name, String emoji, long targetPaise, long savedPaise, boolean active,
                               int percent) {
        public static GoalResponse from(SavingsGoal g) {
            int pct = (int) Math.min(100, g.getSavedPaise() * 100 / Math.max(1, g.getTargetPaise()));
            return new GoalResponse(g.getId(), g.getName(), g.getEmoji(), g.getTargetPaise(), g.getSavedPaise(),
                    g.isActive(), pct);
        }
    }
}
