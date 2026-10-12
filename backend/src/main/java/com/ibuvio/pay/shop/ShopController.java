package com.ibuvio.pay.shop;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ibuvio.pay.common.Clock;
import com.ibuvio.pay.security.CurrentUser;
import com.ibuvio.pay.shop.ShopDtos.DailySummary;
import com.ibuvio.pay.shop.ShopDtos.EntryRequest;
import com.ibuvio.pay.shop.ShopDtos.EntryResponse;
import com.ibuvio.pay.shop.ShopDtos.GstReport;
import com.ibuvio.pay.shop.ShopDtos.ProfileRequest;
import com.ibuvio.pay.shop.ShopDtos.ProfileResponse;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;

@RestController
@RequestMapping("/api/v1/shop")
@Validated
public class ShopController {

    private static final String MONTH = "^\\d{4}-(0[1-9]|1[0-2])$";

    private final ShopService service;

    public ShopController(ShopService service) {
        this.service = service;
    }

    @GetMapping("/profile")
    public ProfileResponse profile() {
        return service.profile(CurrentUser.id());
    }

    @PutMapping("/profile")
    public ProfileResponse saveProfile(@Valid @RequestBody ProfileRequest req) {
        return service.saveProfile(CurrentUser.id(), req);
    }

    @PostMapping("/entries")
    @ResponseStatus(HttpStatus.CREATED)
    public EntryResponse add(@Valid @RequestBody EntryRequest req) {
        return service.addEntry(CurrentUser.id(), req);
    }

    @GetMapping("/entries")
    public List<EntryResponse> entries(@RequestParam(required = false) LocalDate date) {
        return service.entries(CurrentUser.id(), date == null ? LocalDate.now(Clock.IST) : date);
    }

    @DeleteMapping("/entries/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.deleteEntry(CurrentUser.id(), id);
    }

    @GetMapping("/summary/daily")
    public DailySummary daily(@RequestParam(required = false) LocalDate date) {
        return service.daily(CurrentUser.id(), date == null ? LocalDate.now(Clock.IST) : date);
    }

    @GetMapping("/summary/range")
    public List<DailySummary> range(@RequestParam LocalDate from, @RequestParam LocalDate to) {
        return service.range(CurrentUser.id(), from, to);
    }

    @GetMapping("/reports/gst")
    public GstReport gst(@RequestParam @Pattern(regexp = MONTH) String month) {
        return service.gst(CurrentUser.id(), YearMonth.parse(month));
    }

    @GetMapping("/reports/ledger.csv")
    public ResponseEntity<String> csv(@RequestParam @Pattern(regexp = MONTH) String month) {
        return ResponseEntity.ok()
                .contentType(new MediaType("text", "csv"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"ibuvio-ledger-" + month + ".csv\"")
                .body(service.ledgerCsv(CurrentUser.id(), YearMonth.parse(month)));
    }
}
