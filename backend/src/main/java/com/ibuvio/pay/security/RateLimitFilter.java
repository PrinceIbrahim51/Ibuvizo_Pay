package com.ibuvio.pay.security;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.ibuvio.pay.common.ErrorResponse;
import com.ibuvio.pay.config.AppProperties;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Token-bucket rate limiting per client IP (auth endpoints) and per user (everything else).
 * In-memory, so limits are per instance: for multiple instances back this with Redis
 * or enforce it at the API gateway as well.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Duration WINDOW = Duration.ofMinutes(1);

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final AppProperties.RateLimit cfg;

    public RateLimitFilter(AppProperties props) {
        this.cfg = props.rateLimit();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String path = req.getRequestURI();
        String ip = ClientIp.of(req);
        String key;
        int limit;
        if (path.startsWith("/api/v1/auth/")) {
            key = "auth:" + ip;
            limit = cfg.authPerMinute();
        } else if (path.startsWith("/api/v1/payments") && "POST".equals(req.getMethod())) {
            key = "pay:" + principalOr(ip);
            limit = cfg.paymentsPerMinute();
        } else {
            key = "gen:" + principalOr(ip);
            limit = cfg.generalPerMinute();
        }
        Bucket bucket = buckets.computeIfAbsent(key, k -> new Bucket(limit));
        if (!bucket.tryConsume(limit)) {
            res.setStatus(429);
            res.setHeader("Retry-After", "60");
            res.setContentType(MediaType.APPLICATION_JSON_VALUE);
            res.getWriter().write(ErrorResponse.json("RATE_LIMITED", "Too many requests. Please slow down"));
            return;
        }
        chain.doFilter(req, res);
    }

    private static String principalOr(String ip) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AuthenticatedUser u) {
            return u.id().toString();
        }
        return ip;
    }

    @Scheduled(fixedDelay = 300_000)
    void evictIdle() {
        long cutoff = System.nanoTime() - Duration.ofMinutes(10).toNanos();
        buckets.entrySet().removeIf(e -> e.getValue().lastRefill < cutoff);
    }

    /** Clears all buckets (used by tests). */
    public void reset() {
        buckets.clear();
    }

    private static final class Bucket {
        private double tokens;
        private long lastRefill = System.nanoTime();

        Bucket(int capacity) {
            this.tokens = capacity;
        }

        synchronized boolean tryConsume(int capacity) {
            long now = System.nanoTime();
            double refill = (now - lastRefill) * (double) capacity / WINDOW.toNanos();
            tokens = Math.min(capacity, tokens + refill);
            lastRefill = now;
            if (tokens >= 1) {
                tokens -= 1;
                return true;
            }
            return false;
        }
    }
}
