package com.ibuvio.pay.config;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;

/**
 * Fails fast at startup when environment variables are missing, weak or unsafe for production.
 * This is the "check env variables" control: the app refuses to boot instead of running insecurely.
 */
@Component
public class StartupSecurityValidator {

    private static final Logger log = LoggerFactory.getLogger(StartupSecurityValidator.class);

    private final AppProperties props;
    private final Environment env;

    public StartupSecurityValidator(AppProperties props, Environment env) {
        this.props = props;
        this.env = env;
    }

    @PostConstruct
    void validate() {
        List<String> problems = new ArrayList<>();
        boolean prod = Arrays.asList(env.getActiveProfiles()).contains("prod")
                || env.getActiveProfiles().length == 0;

        checkKey(problems, "JWT_SECRET", props.jwt().secret(), 64, false);
        checkKey(problems, "APP_ENCRYPTION_KEY", props.crypto().encryptionKey(), 32, true);
        checkKey(problems, "APP_HMAC_KEY", props.crypto().hmacKey(), 32, false);

        if (props.jwt().accessTtl().toMinutes() > 30) {
            problems.add("JWT_ACCESS_TTL must be 30 minutes or less");
        }

        if (prod) {
            if ("log".equalsIgnoreCase(props.otp().sender())) {
                problems.add("OTP_SENDER=log prints OTPs to logs and is not allowed in production");
            }
            if ("sms-gateway".equalsIgnoreCase(props.otp().sender())) {
                String url = props.otp().smsGateway().url();
                if (url == null || !url.startsWith("https://")) {
                    problems.add("SMS_GATEWAY_URL must be an https:// URL in production");
                }
                if (isBlank(props.otp().smsGateway().apiKey())) {
                    problems.add("SMS_GATEWAY_API_KEY is required in production");
                }
            }
            String dbUrl = env.getProperty("spring.datasource.url", "");
            if (dbUrl.startsWith("jdbc:postgresql") && !dbUrl.contains("sslmode=verify-full")
                    && !dbUrl.contains("sslmode=require")) {
                problems.add("DB_URL must use TLS in production (add ?sslmode=verify-full)");
            }
            for (String origin : safeList(props.cors().allowedOrigins())) {
                if (origin.equals("*") || origin.startsWith("http://")) {
                    problems.add("CORS_ALLOWED_ORIGINS must list explicit https:// origins in production");
                }
            }
            if ("sandbox".equalsIgnoreCase(props.psp().mode())) {
                log.warn("PSP_MODE=sandbox: payments move simulated money only. Connect a licensed PSP bank before real launch.");
            }
        }

        if (!problems.isEmpty()) {
            throw new IllegalStateException("Refusing to start, insecure configuration:\n - "
                    + String.join("\n - ", problems));
        }
    }

    private static void checkKey(List<String> problems, String name, String value, int minBytes, boolean exact) {
        if (isBlank(value)) {
            problems.add(name + " is not set");
            return;
        }
        try {
            int len = Base64.getDecoder().decode(value).length;
            if (exact ? len != minBytes : len < minBytes) {
                problems.add(name + " must decode to " + (exact ? "exactly " : "at least ") + minBytes + " bytes");
            }
        } catch (IllegalArgumentException e) {
            problems.add(name + " must be base64 encoded");
        }
    }

    private static List<String> safeList(List<String> list) {
        return list == null ? List.of() : list.stream().filter(s -> !isBlank(s)).toList();
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
