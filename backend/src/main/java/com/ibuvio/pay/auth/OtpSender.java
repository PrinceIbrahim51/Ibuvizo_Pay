package com.ibuvio.pay.auth;

public interface OtpSender {

    void send(String phone, String code);
}
