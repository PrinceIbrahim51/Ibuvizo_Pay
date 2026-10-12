package com.ibuvio.pay.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Prints OTPs to the server log so you can test without an SMS provider.
 * Only loaded with the dev/test/staging profile AND OTP_SENDER=log. StartupSecurityValidator refuses it in
 * prod, and in staging allows it only while PSP_MODE=sandbox (simulated money).
 */
@Component
@Profile({"dev", "test", "staging"})
@ConditionalOnProperty(name = "app.otp.sender", havingValue = "log")
public class LogOtpSender implements OtpSender {

    private static final Logger log = LoggerFactory.getLogger(LogOtpSender.class);

    @Override
    public void send(String phone, String code) {
        log.warn("[DEV ONLY] OTP for ***{} is {}", phone.substring(phone.length() - 4), code);
    }
}
