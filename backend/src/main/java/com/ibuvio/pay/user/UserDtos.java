package com.ibuvio.pay.user;

import java.time.Instant;
import java.util.UUID;

import com.ibuvio.pay.common.InputRules;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class UserDtos {

    private UserDtos() {}

    public record ProfileResponse(UUID id, String fullName, String phone, String email, String vpa,
                                  String kycStatus, String role, boolean businessMode, boolean roundUpEnabled,
                                  int roundUpToRupees, String preferredLanguage, boolean notificationsOn,
                                  Instant memberSince) {
        public static ProfileResponse from(User u) {
            return new ProfileResponse(u.getId(), u.getFullName(), u.getPhone(), u.getEmail(), u.getVpa(),
                    u.getKycStatus().name(), u.getRole().name(), u.isBusinessMode(), u.isRoundUpEnabled(),
                    u.getRoundUpToRupees(), u.getPreferredLanguage(), u.isNotificationsOn(), u.getCreatedAt());
        }
    }

    /** All fields optional: only non-null values are applied. Role/KYC/status can never be changed here. */
    public record UpdateProfileRequest(
            @Pattern(regexp = InputRules.NAME) String fullName,
            @Pattern(regexp = InputRules.EMAIL) @Size(max = 120) String email,
            Boolean businessMode,
            Boolean roundUpEnabled,
            @Min(1) @Max(100) Integer roundUpToRupees,
            @Pattern(regexp = "^(en|hi|ta|te)$") String preferredLanguage,
            Boolean notificationsOn) {}

    public record VpaLookupResponse(String vpa, String name, boolean onIbuvio) {}
}
