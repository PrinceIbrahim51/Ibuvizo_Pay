package com.ibuvio.pay.auth;

import java.util.UUID;

import com.ibuvio.pay.common.InputRules;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public final class AuthDtos {

    private AuthDtos() {}

    public record OtpRequest(
            @NotBlank @Pattern(regexp = InputRules.PHONE) String phone,
            @NotNull OtpPurpose purpose) {}

    public record OtpResponse(UUID challengeId, long expiresInSeconds) {}

    public record RegisterRequest(
            @NotBlank @Pattern(regexp = InputRules.PHONE) String phone,
            @NotNull UUID challengeId,
            @NotBlank @Pattern(regexp = InputRules.OTP) String otp,
            @NotBlank @Pattern(regexp = InputRules.NAME) String fullName,
            @NotBlank @Pattern(regexp = InputRules.MPIN) String mpin,
            @NotBlank @Pattern(regexp = InputRules.DEVICE_ID) String deviceId) {}

    public record LoginRequest(
            @NotBlank @Pattern(regexp = InputRules.PHONE) String phone,
            @NotNull UUID challengeId,
            @NotBlank @Pattern(regexp = InputRules.OTP) String otp,
            @NotBlank @Pattern(regexp = InputRules.MPIN) String mpin,
            @NotBlank @Pattern(regexp = InputRules.DEVICE_ID) String deviceId) {}

    public record ResetMpinRequest(
            @NotBlank @Pattern(regexp = InputRules.PHONE) String phone,
            @NotNull UUID challengeId,
            @NotBlank @Pattern(regexp = InputRules.OTP) String otp,
            @NotBlank @Pattern(regexp = InputRules.MPIN) String newMpin) {}

    public record RefreshRequest(
            @NotBlank @Pattern(regexp = "^[A-Za-z0-9_-]{40,64}$") String refreshToken,
            @NotBlank @Pattern(regexp = InputRules.DEVICE_ID) String deviceId) {}

    public record LogoutRequest(@NotBlank @Pattern(regexp = "^[A-Za-z0-9_-]{40,64}$") String refreshToken) {}

    public record TokenResponse(String accessToken, String refreshToken, long expiresIn, String tokenType) {}
}
