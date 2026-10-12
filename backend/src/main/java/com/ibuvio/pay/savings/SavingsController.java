package com.ibuvio.pay.savings;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ibuvio.pay.savings.SavingsDtos.CreateGoalRequest;
import com.ibuvio.pay.savings.SavingsDtos.GoalResponse;
import com.ibuvio.pay.savings.SavingsDtos.WithdrawRequest;
import com.ibuvio.pay.security.CurrentUser;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/savings/goals")
public class SavingsController {

    private final SavingsService service;

    public SavingsController(SavingsService service) {
        this.service = service;
    }

    @GetMapping
    public List<GoalResponse> list() {
        return service.list(CurrentUser.id());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public GoalResponse create(@Valid @RequestBody CreateGoalRequest req) {
        return service.create(CurrentUser.id(), req);
    }

    @PostMapping("/{id}/withdraw")
    public GoalResponse withdraw(@PathVariable UUID id, @Valid @RequestBody WithdrawRequest req) {
        return service.withdraw(CurrentUser.id(), id, req.accountId());
    }
}
