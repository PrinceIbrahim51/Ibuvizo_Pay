package com.ibuvio.pay.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class HashingConfig {

    /**
     * Argon2id (OWASP recommended) for MPINs and sandbox UPI PINs:
     * 16 byte salt, 32 byte hash, 1 lane, 19 MiB memory, 2 iterations.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new Argon2PasswordEncoder(16, 32, 1, 19 * 1024, 2);
    }
}
