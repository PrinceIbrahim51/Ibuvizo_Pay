package com.ibuvio.pay.config;

import java.time.Duration;
import java.util.List;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.security.web.header.writers.StaticHeadersWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.ibuvio.pay.common.ErrorResponse;
import com.ibuvio.pay.security.AdminIpAllowlistFilter;
import com.ibuvio.pay.security.JwtService;
import com.ibuvio.pay.security.RateLimitFilter;
import com.ibuvio.pay.security.UserJwtAuthenticationConverter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain api(HttpSecurity http, JwtService jwtService, UserJwtAuthenticationConverter converter,
                            RateLimitFilter rateLimit, AdminIpAllowlistFilter adminIps) throws Exception {
        http
                // Stateless bearer-token API: no cookies or sessions, so CSRF does not apply.
                .csrf(csrf -> csrf.disable())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .httpBasic(b -> b.disable())
                .formLogin(f -> f.disable())
                .logout(l -> l.disable())
                .requestCache(c -> c.disable())
                .anonymous(a -> {})
                .cors(c -> {})
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/otp", "/api/v1/auth/register",
                                "/api/v1/auth/login", "/api/v1/auth/refresh", "/api/v1/auth/logout",
                                "/api/v1/auth/mpin/reset").permitAll()
                        .requestMatchers(HttpMethod.GET, "/actuator/health", "/actuator/health/liveness",
                                "/actuator/health/readiness").permitAll()
                        .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/v1/**").authenticated()
                        .anyRequest().denyAll()) // deny by default: anything not listed above is closed
                .oauth2ResourceServer(o -> o
                        .jwt(j -> j.decoder(jwtService.decoder()).jwtAuthenticationConverter(converter))
                        .authenticationEntryPoint((req, res, ex) -> writeError(res, 401, "UNAUTHORIZED",
                                "Authentication required"))
                        .accessDeniedHandler((req, res, ex) -> writeError(res, 403, "FORBIDDEN", "Access denied")))
                .exceptionHandling(e -> e
                        .authenticationEntryPoint((req, res, ex) -> writeError(res, 401, "UNAUTHORIZED",
                                "Authentication required"))
                        .accessDeniedHandler((req, res, ex) -> writeError(res, 403, "FORBIDDEN", "Access denied")))
                .headers(h -> h
                        .contentSecurityPolicy(csp -> csp.policyDirectives(
                                "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"))
                        .httpStrictTransportSecurity(hsts -> hsts.includeSubDomains(true).preload(true)
                                .maxAgeInSeconds(Duration.ofDays(365).toSeconds()))
                        .frameOptions(f -> f.deny())
                        .contentTypeOptions(c -> {})
                        .referrerPolicy(r -> r.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER))
                        .cacheControl(c -> {})
                        .addHeaderWriter(new StaticHeadersWriter("Permissions-Policy",
                                "camera=(), microphone=(), geolocation=(), payment=()"))
                        .addHeaderWriter(new StaticHeadersWriter("Cross-Origin-Opener-Policy", "same-origin"))
                        .addHeaderWriter(new StaticHeadersWriter("Cross-Origin-Resource-Policy", "same-origin")))
                .addFilterAfter(rateLimit, BearerTokenAuthenticationFilter.class)
                .addFilterAfter(adminIps, BearerTokenAuthenticationFilter.class);
        return http.build();
    }

    /** These filters run inside the security chain only; stop Spring Boot from also registering them globally. */
    @Bean
    FilterRegistrationBean<RateLimitFilter> rateLimitRegistration(RateLimitFilter f) {
        FilterRegistrationBean<RateLimitFilter> r = new FilterRegistrationBean<>(f);
        r.setEnabled(false);
        return r;
    }

    @Bean
    FilterRegistrationBean<AdminIpAllowlistFilter> adminIpRegistration(AdminIpAllowlistFilter f) {
        FilterRegistrationBean<AdminIpAllowlistFilter> r = new FilterRegistrationBean<>(f);
        r.setEnabled(false);
        return r;
    }

    /** Native mobile apps do not need CORS. Only explicitly configured web origins (e.g. an admin console) are allowed. */
    @Bean
    CorsConfigurationSource corsConfigurationSource(AppProperties props) {
        List<String> origins = props.cors().allowedOrigins() == null ? List.of()
                : props.cors().allowedOrigins().stream().map(String::trim).filter(s -> !s.isEmpty()).toList();
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        if (!origins.isEmpty()) {
            CorsConfiguration cfg = new CorsConfiguration();
            cfg.setAllowedOrigins(origins);
            cfg.setAllowedMethods(List.of("GET", "POST", "PATCH", "PUT", "DELETE"));
            cfg.setAllowedHeaders(List.of("Authorization", "Content-Type", "Idempotency-Key"));
            cfg.setAllowCredentials(false);
            cfg.setMaxAge(Duration.ofHours(1));
            source.registerCorsConfiguration("/api/**", cfg);
        }
        return source;
    }

    private static void writeError(jakarta.servlet.http.HttpServletResponse res, int status, String code,
                                   String message) throws java.io.IOException {
        res.setStatus(status);
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.getWriter().write(ErrorResponse.json(code, message));
    }
}
