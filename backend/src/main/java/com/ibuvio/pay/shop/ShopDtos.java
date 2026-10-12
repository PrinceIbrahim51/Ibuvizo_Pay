package com.ibuvio.pay.shop;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.ibuvio.pay.common.InputRules;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public final class ShopDtos {

    private ShopDtos() {}

    public record ProfileRequest(
            @NotBlank @Pattern(regexp = InputRules.SAFE_TEXT) String shopName,
            @Pattern(regexp = InputRules.GSTIN) String gstin,
            @NotBlank @Pattern(regexp = InputRules.CATEGORY) String category,
            @NotNull @Min(0) @Max(28) Integer defaultGst) {}

    public record ProfileResponse(String shopName, String gstin, String category, int defaultGst) {
        public static ProfileResponse from(ShopProfile p) {
            return new ProfileResponse(p.getShopName(), p.getGstin(), p.getCategory(), p.getDefaultGst());
        }
    }

    public record EntryRequest(
            @NotNull EntryType type,
            @NotNull @Min(100) @Max(100000000) Long amountPaise,
            @NotNull @Min(0) @Max(28) Integer gstRate,
            @NotBlank @Pattern(regexp = InputRules.CATEGORY) String category,
            @NotBlank @Pattern(regexp = "^(CASH|UPI|CARD|CREDIT)$") String paymentMode,
            @Pattern(regexp = InputRules.SAFE_TEXT) String note,
            LocalDate entryDate,
            Boolean fromVoice) {}

    public record EntryResponse(UUID id, String type, long amountPaise, int gstRate, long gstPaise, String category,
                                String paymentMode, String note, String source, LocalDate entryDate,
                                Instant createdAt) {
        public static EntryResponse from(LedgerEntry e) {
            return new EntryResponse(e.getId(), e.getType().name(), e.getAmountPaise(), e.getGstRate(),
                    Gst.taxIn(e.getAmountPaise(), e.getGstRate()), e.getCategory(), e.getPaymentMode(), e.getNote(),
                    e.getSource().name(), e.getEntryDate(), e.getCreatedAt());
        }
    }

    public record DailySummary(LocalDate date, long incomePaise, long expensePaise, long profitPaise, int entries,
                               Map<String, Long> incomeByMode, Map<String, Long> expenseByCategory) {}

    public record GstRateRow(int rate, long grossPaise, long taxablePaise, long gstPaise, long cgstPaise,
                             long sgstPaise) {}

    public record GstReport(String month, String shopName, String gstin, List<GstRateRow> outward,
                            List<GstRateRow> inward, long outputTaxPaise, long inputTaxCreditPaise,
                            long netPayablePaise) {}
}
