package com.ibuvio.pay.security;

import java.util.List;
import java.util.UUID;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.stereotype.Component;

import com.ibuvio.pay.user.User;
import com.ibuvio.pay.user.UserRepository;
import com.ibuvio.pay.user.UserStatus;

/**
 * After the JWT signature/expiry/issuer/audience checks pass, the live user record is loaded so that
 * frozen users, logged-out-everywhere sessions and role changes take effect immediately.
 * Roles always come from the database, never from token claims.
 */
@Component
public class UserJwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final UserRepository users;

    public UserJwtAuthenticationConverter(UserRepository users) {
        this.users = users;
    }

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        UUID id;
        try {
            id = UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new InvalidBearerTokenException("Invalid subject");
        }
        User user = users.findById(id).orElseThrow(() -> new InvalidBearerTokenException("Unknown user"));
        if (user.getStatus() != UserStatus.ACTIVE || user.getTokenVersion() != JwtService.tokenVersion(jwt)) {
            throw new InvalidBearerTokenException("Session no longer valid");
        }
        AuthenticatedUser principal = new AuthenticatedUser(user.getId(), user.getRole());
        return new UsernamePasswordAuthenticationToken(principal, null,
                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())));
    }
}
