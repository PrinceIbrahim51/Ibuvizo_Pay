package com.ibuvio.pay.common;

import java.util.List;

public record ErrorResponse(String code, String message, List<String> fields) {

    public static ErrorResponse of(String code, String message) {
        return new ErrorResponse(code, message, null);
    }

    /** Hand-built JSON so filters can respond without a JSON library; inputs are fixed constants only. */
    public static String json(String code, String message) {
        return "{\"code\":\"" + code + "\",\"message\":\"" + message + "\"}";
    }
}
