package com.ibuvio.pay.auth;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.ibuvio.pay.common.ApiException;
import com.ibuvio.pay.config.AppProperties;

/**
 * Sends OTPs through an HTTPS SMS gateway (MSG91, Gupshup, Twilio... adapt the payload to your provider).
 * The API key is read from SMS_GATEWAY_API_KEY and sent in a header, never in the URL.
 */
@Component
@ConditionalOnProperty(name = "app.otp.sender", havingValue = "sms-gateway", matchIfMissing = true)
public class SmsGatewayOtpSender implements OtpSender {

    private static final Logger log = LoggerFactory.getLogger(SmsGatewayOtpSender.class);

    private final AppProperties.SmsGateway cfg;
    private final RestClient client;

    public SmsGatewayOtpSender(AppProperties props, RestClient.Builder builder) {
        this.cfg = props.otp().smsGateway();
        this.client = builder.build();
    }

    @Override
    public void send(String phone, String code) {
        try {
            client.post()
                    .uri(cfg.url())
                    .header("Authorization", "Bearer " + cfg.apiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("to", phone, "sender", cfg.senderId(),
                            "message", code + " is your IBUVIO OTP. Valid for 5 minutes. Never share it with anyone."))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException e) {
            log.error("SMS gateway call failed: {}", e.getClass().getSimpleName());
            throw new ApiException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, "OTP_UNAVAILABLE",
                    "Could not send OTP right now, please try again");
        }
    }
}
