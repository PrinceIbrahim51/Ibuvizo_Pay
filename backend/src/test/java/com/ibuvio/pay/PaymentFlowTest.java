package com.ibuvio.pay;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;

import com.jayway.jsonpath.JsonPath;

class PaymentFlowTest extends IntegrationTestBase {

    @Autowired
    JdbcTemplate jdbc;

    String alice;
    String aliceAccount;
    String bob;
    String bobVpa;

    @BeforeEach
    void users() throws Exception {
        alice = register(newPhone(), "Alice Kumar", "482915")[0];
        bob = register(newPhone(), "Bob Raj", "482915")[0];
        rateLimitFilter.reset();
        // Skip the new-account cooling period for these tests.
        jdbc.update("update users set created_at = created_at - interval '2' day");
        aliceAccount = linkAccount(alice, "HDFC", "HDFC0001234", "2468");
        linkAccount(bob, "SBIN", "SBIN0004567", "1357");
        bobVpa = JsonPath.read(mvc.perform(get("/api/v1/me").header("Authorization", bearer(bob)))
                .andReturn().getResponse().getContentAsString(), "$.vpa");
    }

    private String payBody(String vpa, long paise, String pin) {
        return """
                {"payeeVpa":"%s","amountPaise":%d,"note":"Dinner","upiPin":"%s","channel":"VPA"}
                """.formatted(vpa, paise, pin);
    }

    @Test
    void paysAnotherUserAndBothPassbooksUpdate() throws Exception {
        mvc.perform(post("/api/v1/payments").header("Authorization", bearer(alice))
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON).content(payBody(bobVpa, 50000, "2468")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.counterpartyName").value("Bob Raj"));

        mvc.perform(get("/api/v1/payments?filter=RECEIVED").header("Authorization", bearer(bob)))
                .andExpect(jsonPath("$.content[0].amountPaise").value(50000))
                .andExpect(jsonPath("$.content[0].counterpartyName").value("Alice Kumar"));

        mvc.perform(post("/api/v1/accounts/" + aliceAccount + "/balance").header("Authorization", bearer(alice))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"upiPin\":\"2468\"}"))
                .andExpect(jsonPath("$.balancePaise").value(5000000 - 50000));
    }

    @Test
    void sameIdempotencyKeyNeverChargesTwice() throws Exception {
        String key = UUID.randomUUID().toString();
        String first = mvc.perform(post("/api/v1/payments").header("Authorization", bearer(alice))
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON).content(payBody(bobVpa, 10000, "2468")))
                .andReturn().getResponse().getContentAsString();
        String second = mvc.perform(post("/api/v1/payments").header("Authorization", bearer(alice))
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON).content(payBody(bobVpa, 10000, "2468")))
                .andReturn().getResponse().getContentAsString();
        assertThat((String) JsonPath.read(second, "$.id")).isEqualTo(JsonPath.read(first, "$.id"));
        mvc.perform(get("/api/v1/payments?filter=SENT").header("Authorization", bearer(alice)))
                .andExpect(jsonPath("$.page.totalElements").value(1));
    }

    @Test
    void paymentWithoutIdempotencyKeyIsRejected() throws Exception {
        mvc.perform(post("/api/v1/payments").header("Authorization", bearer(alice))
                        .contentType(MediaType.APPLICATION_JSON).content(payBody(bobVpa, 10000, "2468")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void threeWrongUpiPinsBlockThePin() throws Exception {
        for (int i = 0; i < 3; i++) {
            mvc.perform(post("/api/v1/payments").header("Authorization", bearer(alice))
                            .header("Idempotency-Key", UUID.randomUUID().toString())
                            .contentType(MediaType.APPLICATION_JSON).content(payBody(bobVpa, 10000, "9753")))
                    .andExpect(jsonPath("$.code").value("UPI_PIN_INCORRECT"));
        }
        mvc.perform(post("/api/v1/payments").header("Authorization", bearer(alice))
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON).content(payBody(bobVpa, 10000, "2468")))
                .andExpect(status().isLocked());
    }

    @Test
    void cannotOverspendOrExceedLimits() throws Exception {
        mvc.perform(post("/api/v1/payments").header("Authorization", bearer(alice))
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON).content(payBody(bobVpa, 20000000, "2468")))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/payments").header("Authorization", bearer(alice))
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON).content(payBody(bobVpa, -500, "2468")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void usersCannotSeeOrUseEachOthersData() throws Exception {
        String txn = JsonPath.read(mvc.perform(post("/api/v1/payments").header("Authorization", bearer(alice))
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON).content(payBody(bobVpa, 10000, "2468")))
                .andReturn().getResponse().getContentAsString(), "$.id");
        // Bob guesses Alice's transaction id and account id (IDOR attempts).
        mvc.perform(get("/api/v1/payments/" + txn).header("Authorization", bearer(bob)))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/accounts/" + aliceAccount + "/balance").header("Authorization", bearer(bob))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"upiPin\":\"2468\"}"))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/payments").header("Authorization", bearer(bob))
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"payeeVpa":"someone@okbank","amountPaise":100,"upiPin":"2468","channel":"VPA","accountId":"%s"}
                                """.formatted(aliceAccount)))
                .andExpect(status().isNotFound());
    }

    @Test
    void normalUsersCannotReachAdminRoutes() throws Exception {
        mvc.perform(get("/api/v1/admin/users").header("Authorization", bearer(alice)))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/admin/audit")).andExpect(status().isUnauthorized());
    }

    @Test
    void adminCanFreezeAndFrozenUserIsLockedOutImmediately() throws Exception {
        String admin = register(newPhone(), "Admin Person", "482915")[0];
        jdbc.update("update users set role = 'ADMIN' where full_name = 'Admin Person'");
        String bobId = JsonPath.read(mvc.perform(get("/api/v1/me").header("Authorization", bearer(bob)))
                .andReturn().getResponse().getContentAsString(), "$.id");
        mvc.perform(post("/api/v1/admin/users/" + bobId + "/freeze").header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("FROZEN"))
                .andExpect(jsonPath("$.maskedPhone").value(org.hamcrest.Matchers.containsString("******")));
        mvc.perform(get("/api/v1/me").header("Authorization", bearer(bob))).andExpect(status().isUnauthorized());
    }

    @Test
    void roundUpMovesSpareChangeIntoSavingsGoal() throws Exception {
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/api/v1/me")
                        .header("Authorization", bearer(alice)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"roundUpEnabled\":true,\"roundUpToRupees\":10}"))
                .andExpect(jsonPath("$.roundUpEnabled").value(true));
        mvc.perform(post("/api/v1/savings/goals").header("Authorization", bearer(alice))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"New bike\",\"emoji\":\"🏍️\",\"targetPaise\":8000000}"))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/payments").header("Authorization", bearer(alice))
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON).content(payBody(bobVpa, 23700, "2468")))
                .andExpect(jsonPath("$.roundUpPaise").value(300));
        mvc.perform(get("/api/v1/savings/goals").header("Authorization", bearer(alice)))
                .andExpect(jsonPath("$[0].savedPaise").value(300));
    }

    @Test
    void shopReceivesUpiAndBooksAreUpdatedAutomatically() throws Exception {
        mvc.perform(put("/api/v1/shop/profile").header("Authorization", bearer(bob))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"shopName\":\"Raj Kirana Store\",\"category\":\"GROCERY\",\"defaultGst\":5}"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/v1/payments").header("Authorization", bearer(alice))
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON).content(payBody(bobVpa, 105000, "2468")))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/shop/entries").header("Authorization", bearer(bob))
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"type":"EXPENSE","amountPaise":30000,"gstRate":0,"category":"STOCK","paymentMode":"CASH","note":"Milk"}
                                """))
                .andExpect(status().isCreated());
        mvc.perform(get("/api/v1/shop/summary/daily").header("Authorization", bearer(bob)))
                .andExpect(jsonPath("$.incomePaise").value(105000))
                .andExpect(jsonPath("$.expensePaise").value(30000))
                .andExpect(jsonPath("$.profitPaise").value(75000));
        String month = java.time.YearMonth.now(com.ibuvio.pay.common.Clock.IST).toString();
        mvc.perform(get("/api/v1/shop/reports/gst?month=" + month).header("Authorization", bearer(bob)))
                .andExpect(jsonPath("$.outward[0].rate").value(5))
                .andExpect(jsonPath("$.outward[0].gstPaise").value(5000))
                .andExpect(jsonPath("$.netPayablePaise").value(5000));
    }

    @Test
    void voiceCommandResolvesRecentContact() throws Exception {
        mvc.perform(post("/api/v1/payments").header("Authorization", bearer(alice))
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON).content(payBody(bobVpa, 10000, "2468")))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/voice/parse").header("Authorization", bearer(alice))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"Bob ko 500 bhejo\",\"language\":\"hi\"}"))
                .andExpect(jsonPath("$.intent").value("PAY"))
                .andExpect(jsonPath("$.amountPaise").value(50000))
                .andExpect(jsonPath("$.payeeVpa").value(bobVpa))
                .andExpect(jsonPath("$.payeeMatched").value(true));
    }
}
