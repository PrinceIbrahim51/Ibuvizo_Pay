package com.ibuvio.pay.config;

import java.time.Duration;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        Jwt jwt,
        Crypto crypto,
        Otp otp,
        Cors cors,
        Admin admin,
        RateLimit rateLimit,
        Psp psp,
        Limits limits) {

    public record Jwt(String secret, String issuer, String audience, Duration accessTtl, Duration refreshTtl) {}

    public record Crypto(String encryptionKey, String hmacKey) {}

    public record Otp(String sender, Duration ttl, int maxAttempts, Duration resendCooldown, int maxPerHour,
                      SmsGateway smsGateway) {}

    public record SmsGateway(String url, String apiKey, String senderId) {}

    public record Cors(List<String> allowedOrigins) {}

    public record Admin(List<String> allowedIps) {}

    public record RateLimit(int authPerMinute, int paymentsPerMinute, int generalPerMinute) {}

    public record Psp(String mode, String vpaHandle, long sandboxOpeningBalancePaise) {}

    public record Limits(long perTransactionPaise, long dailyPaise, long newUserCoolingPaise) {}
}
