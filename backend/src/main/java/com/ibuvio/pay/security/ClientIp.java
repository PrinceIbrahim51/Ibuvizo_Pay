package com.ibuvio.pay.security;

import jakarta.servlet.http.HttpServletRequest;

public final class ClientIp {

    private ClientIp() {}

    /**
     * Uses the container-resolved remote address. X-Forwarded-For is only honoured when
     * server.forward-headers-strategy=native is set behind a trusted proxy, so clients cannot spoof it.
     */
    public static String of(HttpServletRequest request) {
        return request.getRemoteAddr();
    }
}
