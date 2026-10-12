package com.ibuvio.pay.payment;

/** How the payment was started, used for analytics and fraud rules. */
public enum Channel { VPA, QR, CONTACT, VOICE, REQUEST, BANK_TRANSFER }
