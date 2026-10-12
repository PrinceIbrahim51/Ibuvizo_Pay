package com.ibuvio.pay.shop;

import java.time.LocalDate;
import java.util.UUID;

import org.springframework.stereotype.Component;

import com.ibuvio.pay.common.Clock;

/** Hook used by the payment flow so every UPI payment of a business-mode user lands in the books automatically. */
@Component
public class ShopBooks {

    private final LedgerEntryRepository ledger;
    private final ShopProfileRepository profiles;

    public ShopBooks(LedgerEntryRepository ledger, ShopProfileRepository profiles) {
        this.ledger = ledger;
        this.profiles = profiles;
    }

    public void recordUpiSale(UUID shopUserId, long amountPaise, String note, UUID transactionId) {
        int gst = profiles.findById(shopUserId).map(ShopProfile::getDefaultGst).orElse(0);
        ledger.save(new LedgerEntry(shopUserId, EntryType.INCOME, amountPaise, gst, "SALES", "UPI", note,
                EntrySource.UPI, transactionId, today()));
    }

    public void recordUpiExpense(UUID shopUserId, long amountPaise, int gstRate, String category, String note,
                                 UUID transactionId) {
        ledger.save(new LedgerEntry(shopUserId, EntryType.EXPENSE, amountPaise, gstRate, category, "UPI", note,
                EntrySource.UPI, transactionId, today()));
    }

    private static LocalDate today() {
        return LocalDate.now(Clock.IST);
    }
}
