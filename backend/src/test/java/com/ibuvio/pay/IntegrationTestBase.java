package com.ibuvio.pay;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.ibuvio.pay.auth.OtpSender;
import com.jayway.jsonpath.JsonPath;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(IntegrationTestBase.CapturingOtp.class)
public abstract class IntegrationTestBase {

    /** Keys are generated per test run, so no secret-looking values are ever committed. */
    @DynamicPropertySource
    static void secrets(DynamicPropertyRegistry r) {
        r.add("app.jwt.secret", () -> randomKey(64));
        r.add("app.crypto.encryption-key", () -> randomKey(32));
        r.add("app.crypto.hmac-key", () -> randomKey(32));
    }

    static final Map<String, String> SENT_OTPS = new ConcurrentHashMap<>();

    @TestConfiguration
    static class CapturingOtp {
        @Bean
        OtpSender capturingOtpSender() {
            return SENT_OTPS::put;
        }
    }

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected com.ibuvio.pay.security.RateLimitFilter rateLimitFilter;

    @BeforeEach
    void resetRateLimits() {
        rateLimitFilter.reset();
    }

    private static String randomKey(int bytes) {
        byte[] b = new byte[bytes];
        new SecureRandom().nextBytes(b);
        return Base64.getEncoder().encodeToString(b);
    }

    private static int phoneCounter = 0;

    /** Unique valid Indian mobile number per call. */
    protected static synchronized String newPhone() {
        phoneCounter++;
        return "+9198" + String.format("%08d", (System.nanoTime() / 1000 + phoneCounter) % 100_000_000);
    }

    protected static String deviceId() {
        return UUID.randomUUID().toString();
    }

    protected String otp(String phone, String purpose) throws Exception {
        MvcResult r = mvc.perform(post("/api/v1/auth/otp").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"" + phone + "\",\"purpose\":\"" + purpose + "\"}"))
                .andExpect(status().isAccepted()).andReturn();
        return JsonPath.read(r.getResponse().getContentAsString(), "$.challengeId");
    }

    /** Registers a user and returns [accessToken, refreshToken, deviceId]. */
    protected String[] register(String phone, String name, String mpin) throws Exception {
        String challenge = otp(phone, "REGISTER");
        String device = deviceId();
        MvcResult r = mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"phone":"%s","challengeId":"%s","otp":"%s","fullName":"%s","mpin":"%s","deviceId":"%s"}
                                """.formatted(phone, challenge, SENT_OTPS.get(phone), name, mpin, device)))
                .andExpect(status().isCreated()).andReturn();
        String body = r.getResponse().getContentAsString();
        return new String[] {JsonPath.read(body, "$.accessToken"), JsonPath.read(body, "$.refreshToken"), device};
    }

    protected String linkAccount(String token, String bank, String ifsc, String pin) throws Exception {
        MvcResult r = mvc.perform(post("/api/v1/accounts").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"bankCode":"%s","accountNumber":"50100012348421","ifsc":"%s","accountType":"SAVINGS","upiPin":"%s"}
                                """.formatted(bank, ifsc, pin)))
                .andExpect(status().isCreated()).andReturn();
        return JsonPath.read(r.getResponse().getContentAsString(), "$.id");
    }

    protected static String bearer(String token) {
        return "Bearer " + token;
    }
}
