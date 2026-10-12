package com.ibuvio.pay.config;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import com.ibuvio.pay.security.KeyMaterial;

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
        List<String> profiles = Arrays.asList(env.getActiveProfiles());
        boolean staging = profiles.contains("staging");
        // staging = production hardening on a sandbox deployment (simulated money)
        boolean prod = profiles.contains("prod") || staging || profiles.isEmpty();

        checkKey(problems, "JWT_SECRET", props.jwt().secret());
        checkKey(problems, "APP_ENCRYPTION_KEY", props.crypto().encryptionKey());
        checkKey(problems, "APP_HMAC_KEY", props.crypto().hmacKey());

        if (props.jwt().accessTtl().toMinutes() > 30) {
            problems.add("JWT_ACCESS_TTL must be 30 minutes or less");
        }

        if (prod) {
            if ("log".equalsIgnoreCase(props.otp().sender())) {
                if (!staging || !"sandbox".equalsIgnoreCase(props.psp().mode())) {
                    problems.add("OTP_SENDER=log prints OTPs to logs; it is only allowed in the staging profile with PSP_MODE=sandbox");
                } else {
                    log.warn("STAGING: OTPs are written to the server log (visible to the operator only). Configure an SMS gateway before real users.");
                }
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

    private static void checkKey(List<String> problems, String name, String value) {
        if (isBlank(value)) {
            problems.add(name + " is not set");
        } else if (KeyMaterial.bytes(value).length < KeyMaterial.MIN_BYTES) {
            problems.add(name + " must contain at least 256 bits (e.g. openssl rand -base64 32)");
        }
    }

    private static List<String> safeList(List<String> list) {
        return list == null ? List.of() : list.stream().filter(s -> !isBlank(s)).toList();
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
