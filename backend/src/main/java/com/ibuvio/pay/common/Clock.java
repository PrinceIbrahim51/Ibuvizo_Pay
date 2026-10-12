package com.ibuvio.pay.common;

import java.time.ZoneId;

public final class Clock {

    /** Business days, daily limits and reports follow Indian Standard Time. */
    public static final ZoneId IST = ZoneId.of("Asia/Kolkata");

    private Clock() {}
}
