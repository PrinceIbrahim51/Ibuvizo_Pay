package com.ibuvio.pay.common;

/**
 * Allow-list patterns for every user-supplied string. Anything outside these character sets
 * (angle brackets, quotes, control characters, script tags...) is rejected at the API boundary,
 * which is the primary XSS / injection defence. Unicode letters are allowed so Tamil, Hindi etc. work.
 */
public final class InputRules {

    private InputRules() {}

    /** Indian mobile number in E.164 form: +91 followed by 10 digits starting 6-9. */
    public static final String PHONE = "^\\+91[6-9]\\d{9}$";

    /** App login PIN (MPIN): exactly 6 digits. */
    public static final String MPIN = "^\\d{6}$";

    /** UPI PIN: 4 or 6 digits. */
    public static final String UPI_PIN = "^(\\d{4}|\\d{6})$";

    public static final String OTP = "^\\d{6}$";

    /** Person or shop name: letters (any script), marks, spaces, dot, apostrophe, hyphen. */
    public static final String NAME = "^[\\p{L}\\p{M}][\\p{L}\\p{M} .'-]{0,79}$";

    /** Free text notes: letters, digits, spaces and a small punctuation set. No < > " ` ; \\ or control chars. */
    public static final String SAFE_TEXT = "^[\\p{L}\\p{M}\\p{N} .,'&()/#@:_+!?%-]{0,100}$";

    /** UPI virtual payment address, e.g. arjun.mehta@ibuvio */
    public static final String VPA = "^[a-zA-Z0-9][a-zA-Z0-9._-]{1,48}@[a-zA-Z][a-zA-Z0-9]{1,30}(?:\\.[a-zA-Z0-9]{2,20}){0,3}$";

    public static final String IFSC = "^[A-Z]{4}0[A-Z0-9]{6}$";

    public static final String ACCOUNT_NUMBER = "^\\d{9,18}$";

    public static final String GSTIN = "^\\d{2}[A-Z]{5}\\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$";

    public static final String DEVICE_ID = "^[A-Za-z0-9-]{8,64}$";

    public static final String IDEMPOTENCY_KEY = "^[A-Za-z0-9-]{16,64}$";

    public static final String CATEGORY = "^[A-Z_]{2,30}$";

    public static final String EMAIL = "^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,100}\\.[A-Za-z]{2,10}$";

    /** Normalises whitespace and strips any control characters that slipped through. */
    public static String clean(String s) {
        if (s == null) {
            return null;
        }
        String cleaned = s.replaceAll("\\p{Cntrl}", "").replaceAll("\\s+", " ").trim();
        return cleaned.isEmpty() ? null : cleaned;
    }
}
