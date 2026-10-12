package com.ibuvio.pay.shop;

import java.util.Set;

public final class Gst {

    public static final Set<Integer> RATES = Set.of(0, 5, 12, 18, 28);

    private Gst() {}

    /** GST contained in a GST-inclusive amount, rounded to the nearest paisa: amount * r / (100 + r). */
    public static long taxIn(long inclusivePaise, int rate) {
        if (rate == 0) return 0;
        return Math.round(inclusivePaise * (double) rate / (100 + rate));
    }
}
