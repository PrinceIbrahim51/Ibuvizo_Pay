package com.ibuvio.pay.savings;

public final class RoundUp {

    private RoundUp() {}

    /** Paid Rs 237 with round-up to Rs 10 -> Rs 3 is saved. Exact multiples save nothing. */
    public static long spareChange(long amountPaise, int roundToRupees) {
        long step = roundToRupees * 100L;
        long remainder = amountPaise % step;
        return remainder == 0 ? 0 : step - remainder;
    }
}
