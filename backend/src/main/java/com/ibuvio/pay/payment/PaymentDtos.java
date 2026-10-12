package com.ibuvio.pay.payment;

import java.time.Instant;
import java.util.UUID;

import com.ibuvio.pay.common.InputRules;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public final class PaymentDtos {

    private PaymentDtos() {}

    public record PayRequest(
            @NotBlank @Pattern(regexp = InputRules.VPA) String payeeVpa,
            @Pattern(regexp = InputRules.NAME) String payeeName,
            @NotNull @Min(100) @Max(10000000) Long amountPaise,
            @Pattern(regexp = InputRules.SAFE_TEXT) String note,
            @Pattern(regexp = InputRules.CATEGORY) String category,
            UUID accountId,
            @NotBlank @Pattern(regexp = InputRules.UPI_PIN) String upiPin,
            @NotNull Channel channel,
            Boolean businessExpense,
            @Min(0) @Max(28) Integer gstRate,
            UUID moneyRequestId) {}

    public record TransactionResponse(UUID id, String direction, String counterpartyName, String counterpartyVpa,
                                      long amountPaise, long roundUpPaise, String note, String category,
                                      String channel, String status, String upiRef, Instant createdAt) {
        public static TransactionResponse from(Transaction t) {
            return new TransactionResponse(t.getId(), t.getDirection().name(), t.getCounterpartyName(),
                    t.getCounterpartyVpa(), t.getAmountPaise(), t.getRoundUpPaise(), t.getNote(), t.getCategory(),
                    t.getChannel().name(), t.getStatus().name(), t.getUpiRef(), t.getCreatedAt());
        }
    }

    public record MonthSummary(long spentPaise, long receivedPaise, Integer spentChangePct,
                               Integer receivedChangePct, long roundUpSavedPaise) {}

    public record Contact(String name, String vpa) {}

    public record CreateMoneyRequest(
            @NotBlank @Pattern(regexp = InputRules.VPA) String payerVpa,
            @NotNull @Min(100) @Max(10000000) Long amountPaise,
            @Pattern(regexp = InputRules.SAFE_TEXT) String note) {}

    public record MoneyRequestResponse(UUID id, String counterpartyName, String counterpartyVpa, long amountPaise,
                                       String note, String status, Instant expiresAt, Instant createdAt) {}
}
