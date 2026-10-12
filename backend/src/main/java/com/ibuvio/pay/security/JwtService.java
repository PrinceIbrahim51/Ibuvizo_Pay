package com.ibuvio.pay.security;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.stereotype.Service;

import com.ibuvio.pay.config.AppProperties;
import com.ibuvio.pay.user.User;

/** Issues and validates short-lived HS512 access tokens (signature, expiry, issuer and audience are all checked). */
@Service
public class JwtService {

    private final AppProperties.Jwt cfg;
    private final JwtEncoder encoder;
    private final NimbusJwtDecoder decoder;

    public JwtService(AppProperties props) {
        this.cfg = props.jwt();
        SecretKey key = new SecretKeySpec(KeyMaterial.jwtKey(cfg.secret()), "HmacSHA512");
        this.encoder = NimbusJwtEncoder.withSecretKey(key).algorithm(MacAlgorithm.HS512).build();
        this.decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS512).build();
        this.decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(cfg.issuer()),
                jwt -> jwt.getAudience() != null && jwt.getAudience().contains(cfg.audience())
                        ? OAuth2TokenValidatorResult.success()
                        : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Bad audience", null))));
    }

    public String issueAccessToken(User user) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(cfg.issuer())
                .audience(List.of(cfg.audience()))
                .subject(user.getId().toString())
                .issuedAt(now)
                .expiresAt(now.plus(cfg.accessTtl()))
                .id(UUID.randomUUID().toString())
                .claim("tv", user.getTokenVersion())
                .build();
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS512).build(), claims))
                .getTokenValue();
    }

    public long accessTtlSeconds() {
        return cfg.accessTtl().toSeconds();
    }

    public JwtDecoder decoder() {
        return decoder;
    }

    public static int tokenVersion(Jwt jwt) {
        Object tv = jwt.getClaims().get("tv");
        return tv instanceof Number n ? n.intValue() : -1;
    }
}
