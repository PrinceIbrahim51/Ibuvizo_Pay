package com.ibuvio.pay.security;

import java.util.UUID;

import com.ibuvio.pay.user.Role;

/** Principal placed in the SecurityContext after the JWT and the live user record are both validated. */
public record AuthenticatedUser(UUID id, Role role) {}
