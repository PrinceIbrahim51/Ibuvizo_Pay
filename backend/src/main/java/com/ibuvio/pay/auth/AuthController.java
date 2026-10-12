package com.ibuvio.pay.auth;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ibuvio.pay.auth.AuthDtos.LoginRequest;
import com.ibuvio.pay.auth.AuthDtos.LogoutRequest;
import com.ibuvio.pay.auth.AuthDtos.OtpRequest;
import com.ibuvio.pay.auth.AuthDtos.OtpResponse;
import com.ibuvio.pay.auth.AuthDtos.RefreshRequest;
import com.ibuvio.pay.auth.AuthDtos.RegisterRequest;
import com.ibuvio.pay.auth.AuthDtos.ResetMpinRequest;
import com.ibuvio.pay.auth.AuthDtos.TokenResponse;
import com.ibuvio.pay.config.AppProperties;
import com.ibuvio.pay.security.CurrentUser;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService auth;
    private final AppProperties props;

    public AuthController(AuthService auth, AppProperties props) {
        this.auth = auth;
        this.props = props;
    }

    /** Always returns the same response shape whether or not the number is registered (no user enumeration). */
    @PostMapping("/otp")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public OtpResponse otp(@Valid @RequestBody OtpRequest req) {
        return new OtpResponse(auth.requestOtp(req.phone(), req.purpose()), props.otp().ttl().toSeconds());
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public TokenResponse register(@Valid @RequestBody RegisterRequest req) {
        return auth.register(req);
    }

    @PostMapping("/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest req) {
        return auth.login(req);
    }

    @PostMapping("/mpin/reset")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetMpin(@Valid @RequestBody ResetMpinRequest req) {
        auth.resetMpin(req);
    }

    @PostMapping("/refresh")
    public TokenResponse refresh(@Valid @RequestBody RefreshRequest req) {
        return auth.refresh(req.refreshToken(), req.deviceId());
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@Valid @RequestBody LogoutRequest req) {
        auth.logout(req.refreshToken());
    }

    /** Requires a valid access token: signs the user out of every device. */
    @PostMapping("/logout-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logoutAll() {
        auth.logoutEverywhere(CurrentUser.id());
    }
}
