package com.ibuvio.pay.user;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ibuvio.pay.common.ApiException;
import com.ibuvio.pay.common.InputRules;
import com.ibuvio.pay.security.CurrentUser;
import com.ibuvio.pay.user.UserDtos.ProfileResponse;
import com.ibuvio.pay.user.UserDtos.UpdateProfileRequest;
import com.ibuvio.pay.user.UserDtos.VpaLookupResponse;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;

@RestController
@RequestMapping("/api/v1")
@Validated
public class UserController {

    private final UserRepository users;

    public UserController(UserRepository users) {
        this.users = users;
    }

    @GetMapping("/me")
    public ProfileResponse me() {
        return ProfileResponse.from(users.findById(CurrentUser.id()).orElseThrow(ApiException::unauthorized));
    }

    @PatchMapping("/me")
    @Transactional
    public ProfileResponse update(@Valid @RequestBody UpdateProfileRequest req) {
        User u = users.findById(CurrentUser.id()).orElseThrow(ApiException::unauthorized);
        if (req.fullName() != null) u.setFullName(InputRules.clean(req.fullName()));
        if (req.email() != null) u.setEmail(req.email().toLowerCase());
        if (req.businessMode() != null) u.setBusinessMode(req.businessMode());
        if (req.roundUpEnabled() != null) u.setRoundUpEnabled(req.roundUpEnabled());
        if (req.roundUpToRupees() != null) u.setRoundUpToRupees(req.roundUpToRupees());
        if (req.preferredLanguage() != null) u.setPreferredLanguage(req.preferredLanguage());
        if (req.notificationsOn() != null) u.setNotificationsOn(req.notificationsOn());
        return ProfileResponse.from(u);
    }

    /** Verifies a payee VPA before paying. Returns only the display name, never phone or other PII. */
    @GetMapping("/vpa/{vpa}")
    public VpaLookupResponse lookup(@PathVariable @Pattern(regexp = InputRules.VPA) String vpa) {
        return users.findByVpaIgnoreCase(vpa)
                .filter(u -> u.getStatus() == UserStatus.ACTIVE)
                .map(u -> new VpaLookupResponse(u.getVpa(), maskName(u.getFullName()), true))
                .orElseThrow(() -> ApiException.badRequest("VPA_NOT_FOUND", "UPI ID could not be verified"));
    }

    /** "Rohit Sharma" -> "Rohit S." so lookups cannot be used to harvest full names. */
    static String maskName(String full) {
        String[] parts = full.trim().split("\\s+");
        if (parts.length == 1) return parts[0];
        return parts[0] + " " + parts[parts.length - 1].charAt(0) + ".";
    }
}
