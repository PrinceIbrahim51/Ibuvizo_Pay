package com.ibuvio.pay.bank;

import java.util.UUID;

import com.ibuvio.pay.common.InputRules;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public final class BankDtos {

    private BankDtos() {}

    public record LinkAccountRequest(
            @NotBlank @Pattern(regexp = "^[A-Z]{4}$") String bankCode,
            @NotBlank @Pattern(regexp = InputRules.ACCOUNT_NUMBER) String accountNumber,
            @NotBlank @Pattern(regexp = InputRules.IFSC) String ifsc,
            @NotBlank @Pattern(regexp = "^(SAVINGS|CURRENT)$") String accountType,
            @NotBlank @Pattern(regexp = InputRules.UPI_PIN) String upiPin) {}

    public record PinRequest(@NotBlank @Pattern(regexp = InputRules.UPI_PIN) String upiPin) {}

    public record ChangePinRequest(
            @NotBlank @Pattern(regexp = InputRules.UPI_PIN) String currentPin,
            @NotBlank @Pattern(regexp = InputRules.UPI_PIN) String newPin) {}

    public record AccountResponse(UUID id, String bankCode, String bankName, String accountType, String maskedNumber,
                                  String ifsc, boolean primary, boolean upiPinSet) {
        public static AccountResponse from(BankAccount a) {
            return new AccountResponse(a.getId(), a.getBankCode(), a.getBankName(), a.getAccountType(),
                    "•••• •••• " + a.getAccountLast4(), a.getIfsc(), a.isPrimary(), a.getUpiPinHash() != null);
        }
    }

    public record BalanceResponse(UUID accountId, long balancePaise) {}

    public record BankOption(String code, String name) {}
}
