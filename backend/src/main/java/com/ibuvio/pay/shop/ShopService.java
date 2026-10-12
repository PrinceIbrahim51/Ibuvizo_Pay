package com.ibuvio.pay.shop;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ibuvio.pay.common.ApiException;
import com.ibuvio.pay.common.Clock;
import com.ibuvio.pay.common.InputRules;
import com.ibuvio.pay.shop.ShopDtos.DailySummary;
import com.ibuvio.pay.shop.ShopDtos.EntryRequest;
import com.ibuvio.pay.shop.ShopDtos.EntryResponse;
import com.ibuvio.pay.shop.ShopDtos.GstRateRow;
import com.ibuvio.pay.shop.ShopDtos.GstReport;
import com.ibuvio.pay.shop.ShopDtos.ProfileRequest;
import com.ibuvio.pay.shop.ShopDtos.ProfileResponse;
import com.ibuvio.pay.user.User;
import com.ibuvio.pay.user.UserRepository;

@Service
public class ShopService {

    private final ShopProfileRepository profiles;
    private final LedgerEntryRepository ledger;
    private final UserRepository users;

    public ShopService(ShopProfileRepository profiles, LedgerEntryRepository ledger, UserRepository users) {
        this.profiles = profiles;
        this.ledger = ledger;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public ProfileResponse profile(UUID userId) {
        return profiles.findById(userId).map(ProfileResponse::from).orElseThrow(ApiException::notFound);
    }

    /** Saving a shop profile also switches the user into business mode (auto accounting of UPI receipts). */
    @Transactional
    public ProfileResponse saveProfile(UUID userId, ProfileRequest req) {
        if (!Gst.RATES.contains(req.defaultGst())) {
            throw ApiException.badRequest("GST_RATE", "GST rate must be 0, 5, 12, 18 or 28");
        }
        ShopProfile p = profiles.findById(userId).orElseGet(() -> new ShopProfile(userId));
        p.setShopName(InputRules.clean(req.shopName()));
        p.setGstin(req.gstin());
        p.setCategory(req.category());
        p.setDefaultGst(req.defaultGst());
        profiles.save(p);
        User u = users.findById(userId).orElseThrow(ApiException::unauthorized);
        u.setBusinessMode(true);
        return ProfileResponse.from(p);
    }

    @Transactional
    public EntryResponse addEntry(UUID userId, EntryRequest req) {
        requireShop(userId);
        if (!Gst.RATES.contains(req.gstRate())) {
            throw ApiException.badRequest("GST_RATE", "GST rate must be 0, 5, 12, 18 or 28");
        }
        LocalDate today = LocalDate.now(Clock.IST);
        LocalDate date = req.entryDate() == null ? today : req.entryDate();
        if (date.isAfter(today) || date.isBefore(today.minusYears(1))) {
            throw ApiException.badRequest("ENTRY_DATE", "Entry date must be within the last year");
        }
        EntrySource source = Boolean.TRUE.equals(req.fromVoice()) ? EntrySource.VOICE : EntrySource.MANUAL;
        LedgerEntry e = new LedgerEntry(userId, req.type(), req.amountPaise(), req.gstRate(), req.category(),
                req.paymentMode(), InputRules.clean(req.note()), source, null, date);
        return EntryResponse.from(ledger.save(e));
    }

    /** UPI-sourced entries are tied to a real payment and cannot be deleted, keeping the books honest. */
    @Transactional
    public void deleteEntry(UUID userId, UUID entryId) {
        LedgerEntry e = ledger.findByIdAndUserId(entryId, userId).orElseThrow(ApiException::notFound);
        if (e.getSource() == EntrySource.UPI) {
            throw ApiException.badRequest("ENTRY_LOCKED", "UPI entries are recorded automatically and cannot be deleted");
        }
        ledger.delete(e);
    }

    @Transactional(readOnly = true)
    public List<EntryResponse> entries(UUID userId, LocalDate date) {
        return ledger.findByUserIdAndEntryDateOrderByCreatedAtDesc(userId, date).stream()
                .map(EntryResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public DailySummary daily(UUID userId, LocalDate date) {
        return summarize(date, ledger.findByUserIdAndEntryDateOrderByCreatedAtDesc(userId, date));
    }

    /** Day-by-day profit/loss for charts (max 31 days). */
    @Transactional(readOnly = true)
    public List<DailySummary> range(UUID userId, LocalDate from, LocalDate to) {
        if (to.isBefore(from) || from.plusDays(31).isBefore(to)) {
            throw ApiException.badRequest("RANGE", "Range must be 1 to 31 days");
        }
        Map<LocalDate, List<LedgerEntry>> byDay = new TreeMap<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            byDay.put(d, new ArrayList<>());
        }
        ledger.findByUserIdAndEntryDateBetweenOrderByEntryDateAscCreatedAtAsc(userId, from, to)
                .forEach(e -> byDay.get(e.getEntryDate()).add(e));
        return byDay.entrySet().stream().map(en -> summarize(en.getKey(), en.getValue())).toList();
    }

    private static DailySummary summarize(LocalDate date, List<LedgerEntry> list) {
        long income = 0;
        long expense = 0;
        Map<String, Long> byMode = new TreeMap<>();
        Map<String, Long> byCategory = new TreeMap<>();
        for (LedgerEntry e : list) {
            if (e.getType() == EntryType.INCOME) {
                income += e.getAmountPaise();
                byMode.merge(e.getPaymentMode(), e.getAmountPaise(), Long::sum);
            } else {
                expense += e.getAmountPaise();
                byCategory.merge(e.getCategory(), e.getAmountPaise(), Long::sum);
            }
        }
        return new DailySummary(date, income, expense, income - expense, list.size(), byMode, byCategory);
    }

    /** GSTR-3B style monthly summary: output tax on sales minus input tax credit on purchases. */
    @Transactional(readOnly = true)
    public GstReport gst(UUID userId, YearMonth month) {
        ShopProfile p = requireShop(userId);
        List<LedgerEntry> entries = ledger.findByUserIdAndEntryDateBetweenOrderByEntryDateAscCreatedAtAsc(userId,
                month.atDay(1), month.atEndOfMonth());
        List<GstRateRow> outward = rows(entries, EntryType.INCOME);
        List<GstRateRow> inward = rows(entries, EntryType.EXPENSE);
        long output = outward.stream().mapToLong(GstRateRow::gstPaise).sum();
        long itc = inward.stream().mapToLong(GstRateRow::gstPaise).sum();
        return new GstReport(month.toString(), p.getShopName(), p.getGstin(), outward, inward, output, itc,
                Math.max(0, output - itc));
    }

    private static List<GstRateRow> rows(List<LedgerEntry> entries, EntryType type) {
        Map<Integer, Long> gross = new TreeMap<>();
        Map<Integer, Long> tax = new TreeMap<>();
        for (LedgerEntry e : entries) {
            if (e.getType() != type) continue;
            gross.merge(e.getGstRate(), e.getAmountPaise(), Long::sum);
            tax.merge(e.getGstRate(), Gst.taxIn(e.getAmountPaise(), e.getGstRate()), Long::sum);
        }
        List<GstRateRow> rows = new ArrayList<>();
        gross.forEach((rate, g) -> {
            long t = tax.get(rate);
            long cgst = t / 2;
            rows.add(new GstRateRow(rate, g, g - t, t, cgst, t - cgst));
        });
        return rows;
    }

    /** CSV export for the accountant. Cells are escaped to prevent CSV/formula injection in Excel. */
    @Transactional(readOnly = true)
    public String ledgerCsv(UUID userId, YearMonth month) {
        requireShop(userId);
        StringBuilder sb = new StringBuilder("date,type,category,payment_mode,amount_rs,gst_rate,gst_rs,source,note\n");
        for (LedgerEntry e : ledger.findByUserIdAndEntryDateBetweenOrderByEntryDateAscCreatedAtAsc(userId,
                month.atDay(1), month.atEndOfMonth())) {
            sb.append(e.getEntryDate()).append(',')
                    .append(e.getType()).append(',')
                    .append(csv(e.getCategory())).append(',')
                    .append(e.getPaymentMode()).append(',')
                    .append(rupees(e.getAmountPaise())).append(',')
                    .append(e.getGstRate()).append(',')
                    .append(rupees(Gst.taxIn(e.getAmountPaise(), e.getGstRate()))).append(',')
                    .append(e.getSource()).append(',')
                    .append(csv(e.getNote())).append('\n');
        }
        return sb.toString();
    }

    static String csv(String v) {
        if (v == null) return "";
        String s = v;
        if (!s.isEmpty() && "=+-@\t\r".indexOf(s.charAt(0)) >= 0) {
            s = "'" + s;
        }
        return "\"" + s.replace("\"", "\"\"") + "\"";
    }

    private static String rupees(long paise) {
        return String.format("%d.%02d", paise / 100, Math.abs(paise % 100));
    }

    private ShopProfile requireShop(UUID userId) {
        return profiles.findById(userId)
                .orElseThrow(() -> ApiException.badRequest("SHOP_NOT_SET_UP", "Set up your shop profile first"));
    }
}
