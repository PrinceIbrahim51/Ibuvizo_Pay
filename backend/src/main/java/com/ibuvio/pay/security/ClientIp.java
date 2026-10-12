package com.ibuvio.pay.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Resolves the caller's IP for rate limiting and audit logs.
 * By default the container-resolved remote address is used (X-Forwarded-For is honoured only with
 * server.forward-headers-strategy=native behind a trusted proxy). When the app runs exclusively behind an
 * edge that overwrites a client-IP header (Vercel sets x-real-ip), CLIENT_IP_HEADER names that header.
 */
@Component
public class ClientIp {

    private static volatile String trustedHeader = "";

    public ClientIp(@Value("${app.client-ip-header:}") String header) {
        trustedHeader = header == null ? "" : header.trim();
    }

    public static String of(HttpServletRequest request) {
        if (!trustedHeader.isEmpty()) {
            String value = request.getHeader(trustedHeader);
            if (value != null && !value.isBlank()) {
                String first = value.split(",")[0].trim();
                if (first.length() <= 45 && first.matches("[0-9a-fA-F:.]+")) {
                    return first;
                }
            }
        }
        return request.getRemoteAddr();
    }
}
