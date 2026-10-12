package com.ibuvio.pay;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import com.jayway.jsonpath.JsonPath;

class AuthFlowTest extends IntegrationTestBase {

    @Test
    void registerThenLoginWithOtpAndMpin() throws Exception {
        String phone = newPhone();
        String[] tokens = register(phone, "Arjun Mehta", "482915");

        mvc.perform(get("/api/v1/me").header("Authorization", bearer(tokens[0])))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Arjun Mehta"))
                .andExpect(jsonPath("$.vpa", containsString("@ibuvio")))
                .andExpect(jsonPath("$.kycStatus").value("PENDING"))
                .andExpect(jsonPath("$.mpinHash").doesNotExist());

        SENT_OTPS.remove(phone);
        String challenge = loginOtpAfterCooldown(phone);
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody(phone, challenge, SENT_OTPS.get(phone), "482915")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty());
    }

    @Test
    void wrongMpinIsRejectedAndAccountLocksAfterFiveFailures() throws Exception {
        String phone = newPhone();
        register(phone, "Lock Test", "482915");
        for (int i = 0; i < 5; i++) {
            String challenge = loginOtpAfterCooldown(phone);
            mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                            .content(loginBody(phone, challenge, SENT_OTPS.get(phone), "999888")))
                    .andExpect(status().isUnauthorized());
        }
        String challenge = loginOtpAfterCooldown(phone);
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody(phone, challenge, SENT_OTPS.get(phone), "482915")))
                .andExpect(status().isLocked());
    }

    @Test
    void wrongOtpIsRejected() throws Exception {
        String phone = newPhone();
        String challenge = otp(phone, "REGISTER");
        String wrong = SENT_OTPS.get(phone).equals("000000") ? "111111" : "000000";
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content("""
                        {"phone":"%s","challengeId":"%s","otp":"%s","fullName":"Test User","mpin":"482915","deviceId":"%s"}
                        """.formatted(phone, challenge, wrong, deviceId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("OTP_INVALID"));
    }

    @Test
    void weakMpinIsRejected() throws Exception {
        String phone = newPhone();
        String challenge = otp(phone, "REGISTER");
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content("""
                        {"phone":"%s","challengeId":"%s","otp":"%s","fullName":"Test User","mpin":"123456","deviceId":"%s"}
                        """.formatted(phone, challenge, SENT_OTPS.get(phone), deviceId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("WEAK_PIN"));
    }

    @Test
    void otpForUnknownNumberLooksIdenticalButIsNeverSent() throws Exception {
        String phone = newPhone();
        SENT_OTPS.remove(phone);
        otp(phone, "LOGIN"); // 202 like any other number
        assertThat(SENT_OTPS).doesNotContainKey(phone);
    }

    @Test
    void refreshTokenRotatesAndReuseRevokesTheFamily() throws Exception {
        String[] t = register(newPhone(), "Refresh User", "482915");
        String body = mvc.perform(post("/api/v1/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + t[1] + "\",\"deviceId\":\"" + t[2] + "\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String rotated = JsonPath.read(body, "$.refreshToken");
        assertThat(rotated).isNotEqualTo(t[1]);

        // Replaying the old token = theft signal: rejected, and the new token dies too.
        mvc.perform(post("/api/v1/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + t[1] + "\",\"deviceId\":\"" + t[2] + "\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + rotated + "\",\"deviceId\":\"" + t[2] + "\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void logoutEverywhereInvalidatesAccessTokensImmediately() throws Exception {
        String[] t = register(newPhone(), "Logout User", "482915");
        mvc.perform(post("/api/v1/auth/logout-all").header("Authorization", bearer(t[0])))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/me").header("Authorization", bearer(t[0])))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void protectedRoutesRequireAuthAndTamperedTokensFail() throws Exception {
        mvc.perform(get("/api/v1/me")).andExpect(status().isUnauthorized());
        String[] t = register(newPhone(), "Tamper User", "482915");
        String tampered = t[0].substring(0, t[0].length() - 4) + "AAAA";
        mvc.perform(get("/api/v1/me").header("Authorization", bearer(tampered)))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/me").header("Authorization", bearer("eyJhbGciOiJub25lIn0.eyJzdWIiOiJ4In0.")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void securityHeadersArePresentAndErrorsLeakNothing() throws Exception {
        mvc.perform(get("/api/v1/me"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().string("Content-Security-Policy", containsString("default-src 'none'")))
                .andExpect(header().string("Referrer-Policy", "no-referrer"))
                .andExpect(header().string("Cache-Control", containsString("no-store")));
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content("{not json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"))
                .andExpect(jsonPath("$.trace").doesNotExist());
    }

    @Test
    void unknownRoutesAndActuatorInternalsAreClosed() throws Exception {
        mvc.perform(get("/actuator/env")).andExpect(status().isUnauthorized());
        mvc.perform(get("/actuator/health")).andExpect(status().isOk());
        mvc.perform(get("/.env")).andExpect(status().isUnauthorized());
    }

    @Test
    void corsOnlyAllowsConfiguredOrigins() throws Exception {
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options("/api/v1/me")
                        .header("Origin", "https://evil.example")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options("/api/v1/me")
                        .header("Origin", "https://admin.ibuvio.app")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(header().string("Access-Control-Allow-Origin", "https://admin.ibuvio.app"));
    }

    @Test
    void authEndpointsAreRateLimited() throws Exception {
        int tooMany = 0;
        for (int i = 0; i < 15; i++) {
            int s = mvc.perform(post("/api/v1/auth/otp").contentType(MediaType.APPLICATION_JSON)
                            .content("{\"phone\":\"" + newPhone() + "\",\"purpose\":\"LOGIN\"}"))
                    .andReturn().getResponse().getStatus();
            if (s == 429) tooMany++;
        }
        assertThat(tooMany).isGreaterThan(0);
    }

    @Test
    void scriptInjectionInNamesIsRejected() throws Exception {
        String phone = newPhone();
        String challenge = otp(phone, "REGISTER");
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content("""
                        {"phone":"%s","challengeId":"%s","otp":"%s","fullName":"<script>alert(1)</script>","mpin":"482915","deviceId":"%s"}
                        """.formatted(phone, challenge, SENT_OTPS.get(phone), deviceId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    /** OTP requests have a 30 s resend cooldown; tests bypass it by expiring previous challenges directly. */
    private String loginOtpAfterCooldown(String phone) throws Exception {
        rateLimitFilter.reset();
        jdbc.update("update otp_challenges set created_at = created_at - interval '1' hour where phone = ?", phone);
        return otp(phone, "LOGIN");
    }

    @org.springframework.beans.factory.annotation.Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbc;

    private static String loginBody(String phone, String challenge, String otp, String mpin) {
        return """
                {"phone":"%s","challengeId":"%s","otp":"%s","mpin":"%s","deviceId":"%s"}
                """.formatted(phone, challenge, otp, mpin, deviceId());
    }
}
