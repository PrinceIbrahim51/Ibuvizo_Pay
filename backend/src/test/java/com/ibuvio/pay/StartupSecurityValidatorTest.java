package com.ibuvio.pay;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.util.Base64;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import com.ibuvio.pay.config.AppProperties;
import com.ibuvio.pay.config.StartupSecurityValidator;

class StartupSecurityValidatorTest {

    private static String key(int bytes) {
        return Base64.getEncoder().encodeToString(new byte[bytes]);
    }

    private static AppProperties props(String jwt, String otpSender, String smsUrl, List<String> cors) {
        return new AppProperties(
                new AppProperties.Jwt(jwt, "iss", "aud", Duration.ofMinutes(15), Duration.ofDays(30)),
                new AppProperties.Crypto(key(32), key(32)),
                new AppProperties.Otp(otpSender, Duration.ofMinutes(5), 5, Duration.ofSeconds(30), 5,
                        new AppProperties.SmsGateway(smsUrl, "api-key", "IBUVIO")),
                new AppProperties.Cors(cors), new AppProperties.Admin(List.of()),
                new AppProperties.RateLimit(10, 20, 120),
                new AppProperties.Psp("sandbox", "ibuvio", 0),
                new AppProperties.Limits(1, 1, 1));
    }

    private static void validate(AppProperties p, String profile, String dbUrl) throws Exception {
        MockEnvironment env = new MockEnvironment().withProperty("spring.datasource.url", dbUrl);
        env.setActiveProfiles(profile);
        var v = new StartupSecurityValidator(p, env);
        var m = StartupSecurityValidator.class.getDeclaredMethod("validate");
        m.setAccessible(true);
        try {
            m.invoke(v);
        } catch (java.lang.reflect.InvocationTargetException e) {
            throw (Exception) e.getCause();
        }
    }

    @Test
    void refusesShortJwtSecret() {
        assertThatThrownBy(() -> validate(props(key(16), "sms-gateway", "https://sms", List.of()), "prod",
                "jdbc:postgresql://db/x?sslmode=verify-full"))
                .hasMessageContaining("JWT_SECRET");
    }

    @Test
    void refusesLoggedOtpsPlainDbAndWildcardCorsInProd() {
        assertThatThrownBy(() -> validate(props(key(64), "log", null, List.of("*")), "prod", "jdbc:postgresql://db/x"))
                .hasMessageContaining("OTP_SENDER=log")
                .hasMessageContaining("DB_URL must use TLS")
                .hasMessageContaining("CORS_ALLOWED_ORIGINS");
    }

    @Test
    void acceptsHardenedProdConfig() {
        assertThatCode(() -> validate(props(key(64), "sms-gateway", "https://sms.example.com", List.of("https://admin.ibuvio.app")),
                "prod", "jdbc:postgresql://db/x?sslmode=verify-full")).doesNotThrowAnyException();
    }
}
