package com.ibuvio.pay.bank;

import java.util.Arrays;
import java.util.Optional;

/** Banks available in the sandbox. Live mode gets this list from the PSP's account discovery API. */
public enum SupportedBank {
    HDFC("HDFC", "HDFC Bank"),
    SBIN("SBIN", "State Bank of India"),
    UTIB("UTIB", "Axis Bank"),
    ICIC("ICIC", "ICICI Bank"),
    KKBK("KKBK", "Kotak Mahindra Bank"),
    PUNB("PUNB", "Punjab National Bank"),
    CNRB("CNRB", "Canara Bank"),
    IOBA("IOBA", "Indian Overseas Bank"),
    IDIB("IDIB", "Indian Bank");

    private final String ifscPrefix;
    private final String displayName;

    SupportedBank(String ifscPrefix, String displayName) {
        this.ifscPrefix = ifscPrefix;
        this.displayName = displayName;
    }

    public String ifscPrefix() { return ifscPrefix; }

    public String displayName() { return displayName; }

    public static Optional<SupportedBank> of(String code) {
        return Arrays.stream(values()).filter(b -> b.name().equals(code)).findFirst();
    }
}
