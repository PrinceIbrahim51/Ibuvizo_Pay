package com.ibuvio.pay.security;

import java.io.IOException;
import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.ibuvio.pay.common.ErrorResponse;
import com.ibuvio.pay.config.AppProperties;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/** Second layer for admin routes: besides ROLE_ADMIN, the caller IP must be on ADMIN_ALLOWED_IPS when configured. */
@Component
public class AdminIpAllowlistFilter extends OncePerRequestFilter {

    private final List<String> allowed;

    public AdminIpAllowlistFilter(AppProperties props) {
        List<String> ips = props.admin().allowedIps();
        this.allowed = ips == null ? List.of() : ips.stream().map(String::trim).filter(s -> !s.isEmpty()).toList();
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/v1/admin");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        if (!allowed.isEmpty() && !allowed.contains(ClientIp.of(req))) {
            res.setStatus(HttpServletResponse.SC_NOT_FOUND); // do not even reveal that the route exists
            res.setContentType(MediaType.APPLICATION_JSON_VALUE);
            res.getWriter().write(ErrorResponse.json("NOT_FOUND", "Not found"));
            return;
        }
        chain.doFilter(req, res);
    }
}
