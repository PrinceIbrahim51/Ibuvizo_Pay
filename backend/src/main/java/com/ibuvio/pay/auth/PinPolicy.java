package com.ibuvio.pay.auth;

import java.util.Set;

import com.ibuvio.pay.common.ApiException;

/** Rejects easily guessed PINs (repeated or sequential digits, common choices). */
public final class PinPolicy {

    private static final Set<String> COMMON = Set.of("123456", "654321", "121212", "112233", "123123", "696969",
            "1234", "4321", "1212", "2580", "0852", "1122");

    private PinPolicy() {}

    public static void requireStrong(String pin) {
        if (isWeak(pin)) {
            throw ApiException.badRequest("WEAK_PIN", "PIN is too easy to guess. Avoid repeated or sequential digits");
        }
    }

    static boolean isWeak(String pin) {
        if (COMMON.contains(pin) || pin.chars().distinct().count() == 1) {
            return true;
        }
        boolean asc = true;
        boolean desc = true;
        for (int i = 1; i < pin.length(); i++) {
            int diff = pin.charAt(i) - pin.charAt(i - 1);
            asc &= diff == 1;
            desc &= diff == -1;
        }
        return asc || desc;
    }
}
