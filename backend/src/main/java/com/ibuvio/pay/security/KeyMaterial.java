package com.ibuvio.pay.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;

/**
 * Turns a secret from the environment into key bytes. Accepts standard or URL-safe base64 (what
 * `openssl rand -base64` and hosting platforms' "generate value" features produce) and falls back to the
 * raw UTF-8 bytes. Keys of the wrong length are stretched with SHA-2, which keeps the full entropy.
 */
public final class KeyMaterial {

    /** Every secret must carry at least 256 bits. */
    public static final int MIN_BYTES = 32;

    private KeyMaterial() {}

    public static byte[] bytes(String secret) {
        if (secret == null || secret.isBlank()) {
            return new byte[0];
        }
        String s = secret.trim();
        for (Base64.Decoder decoder : new Base64.Decoder[] {Base64.getDecoder(), Base64.getUrlDecoder()}) {
            try {
                byte[] decoded = decoder.decode(s);
                if (decoded.length >= MIN_BYTES) {
                    return decoded;
                }
            } catch (IllegalArgumentException ignored) {
                // not this encoding
            }
        }
        return s.getBytes(StandardCharsets.UTF_8);
    }

    /** 32-byte AES-256 key. */
    public static byte[] aesKey(String secret) {
        byte[] raw = bytes(secret);
        return raw.length == 32 ? raw : digest("SHA-256", raw);
    }

    /** At least 64 bytes, as required for HS512. */
    public static byte[] jwtKey(String secret) {
        byte[] raw = bytes(secret);
        return raw.length >= 64 ? raw : digest("SHA-512", raw);
    }

    private static byte[] digest(String algorithm, byte[] input) {
        try {
            return MessageDigest.getInstance(algorithm).digest(input);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
