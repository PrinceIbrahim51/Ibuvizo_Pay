-- IBUVIO Pay schema. Amounts are stored in paise (BIGINT) to avoid floating point errors.

CREATE TABLE users (
    id                  UUID PRIMARY KEY,
    phone               VARCHAR(15)  NOT NULL UNIQUE,
    full_name           VARCHAR(80)  NOT NULL,
    email               VARCHAR(120),
    vpa                 VARCHAR(60)  NOT NULL UNIQUE,
    mpin_hash           VARCHAR(255) NOT NULL,
    role                VARCHAR(20)  NOT NULL,
    status              VARCHAR(20)  NOT NULL,
    kyc_status          VARCHAR(20)  NOT NULL,
    token_version       INT          NOT NULL DEFAULT 0,
    failed_logins       INT          NOT NULL DEFAULT 0,
    locked_until        TIMESTAMP WITH TIME ZONE,
    business_mode       BOOLEAN      NOT NULL DEFAULT FALSE,
    round_up_enabled    BOOLEAN      NOT NULL DEFAULT FALSE,
    round_up_to_rupees  INT          NOT NULL DEFAULT 10,
    preferred_language  VARCHAR(5)   NOT NULL DEFAULT 'en',
    notifications_on    BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE otp_challenges (
    id          UUID PRIMARY KEY,
    phone       VARCHAR(15)  NOT NULL,
    purpose     VARCHAR(20)  NOT NULL,
    code_hash   VARCHAR(128) NOT NULL,
    attempts    INT          NOT NULL DEFAULT 0,
    consumed    BOOLEAN      NOT NULL DEFAULT FALSE,
    expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX idx_otp_phone_created ON otp_challenges (phone, created_at);

CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY,
    user_id     UUID         NOT NULL REFERENCES users (id),
    family_id   UUID         NOT NULL,
    token_hash  VARCHAR(128) NOT NULL UNIQUE,
    device_id   VARCHAR(64)  NOT NULL,
    revoked     BOOLEAN      NOT NULL DEFAULT FALSE,
    expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX idx_refresh_user ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_family ON refresh_tokens (family_id);

CREATE TABLE bank_accounts (
    id                    UUID PRIMARY KEY,
    user_id               UUID         NOT NULL REFERENCES users (id),
    bank_code             VARCHAR(10)  NOT NULL,
    bank_name             VARCHAR(60)  NOT NULL,
    account_type          VARCHAR(20)  NOT NULL,
    account_number_enc    VARCHAR(255) NOT NULL,
    account_last4         VARCHAR(4)   NOT NULL,
    ifsc                  VARCHAR(11)  NOT NULL,
    upi_pin_hash          VARCHAR(255),
    pin_failures          INT          NOT NULL DEFAULT 0,
    pin_blocked_until     TIMESTAMP WITH TIME ZONE,
    is_primary            BOOLEAN      NOT NULL DEFAULT FALSE,
    sandbox_balance_paise BIGINT       NOT NULL DEFAULT 0,
    created_at            TIMESTAMP WITH TIME ZONE NOT NULL,
    version               BIGINT       NOT NULL DEFAULT 0
);
CREATE INDEX idx_bank_user ON bank_accounts (user_id);

CREATE TABLE transactions (
    id                UUID PRIMARY KEY,
    user_id           UUID         NOT NULL REFERENCES users (id),
    direction         VARCHAR(10)  NOT NULL,
    counterparty_name VARCHAR(80)  NOT NULL,
    counterparty_vpa  VARCHAR(160) NOT NULL,
    counterparty_user UUID,
    bank_account_id   UUID,
    amount_paise      BIGINT       NOT NULL,
    round_up_paise    BIGINT       NOT NULL DEFAULT 0,
    note              VARCHAR(100),
    category          VARCHAR(30)  NOT NULL,
    channel           VARCHAR(20)  NOT NULL,
    status            VARCHAR(20)  NOT NULL,
    upi_ref           VARCHAR(20)  NOT NULL,
    idempotency_key   VARCHAR(64),
    created_at        TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX idx_txn_user_created ON transactions (user_id, created_at);
CREATE UNIQUE INDEX uq_txn_idempotency ON transactions (user_id, idempotency_key);

CREATE TABLE money_requests (
    id              UUID PRIMARY KEY,
    requester_id    UUID         NOT NULL REFERENCES users (id),
    payer_id        UUID         NOT NULL REFERENCES users (id),
    amount_paise    BIGINT       NOT NULL,
    note            VARCHAR(100),
    status          VARCHAR(20)  NOT NULL,
    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX idx_mreq_payer ON money_requests (payer_id, status);
CREATE INDEX idx_mreq_requester ON money_requests (requester_id, status);

CREATE TABLE savings_goals (
    id            UUID PRIMARY KEY,
    user_id       UUID        NOT NULL REFERENCES users (id),
    name          VARCHAR(40) NOT NULL,
    emoji         VARCHAR(8),
    target_paise  BIGINT      NOT NULL,
    saved_paise   BIGINT      NOT NULL DEFAULT 0,
    active        BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL,
    version       BIGINT      NOT NULL DEFAULT 0
);
CREATE INDEX idx_goal_user ON savings_goals (user_id);

CREATE TABLE shop_profiles (
    user_id        UUID PRIMARY KEY REFERENCES users (id),
    shop_name      VARCHAR(80) NOT NULL,
    gstin          VARCHAR(15),
    category       VARCHAR(30) NOT NULL,
    default_gst    INT         NOT NULL DEFAULT 0,
    updated_at     TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE ledger_entries (
    id             UUID PRIMARY KEY,
    user_id        UUID        NOT NULL REFERENCES users (id),
    entry_type     VARCHAR(10) NOT NULL,
    amount_paise   BIGINT      NOT NULL,
    gst_rate       INT         NOT NULL DEFAULT 0,
    category       VARCHAR(30) NOT NULL,
    payment_mode   VARCHAR(10) NOT NULL,
    note           VARCHAR(100),
    source         VARCHAR(10) NOT NULL,
    transaction_id UUID,
    entry_date     DATE        NOT NULL,
    created_at     TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX idx_ledger_user_date ON ledger_entries (user_id, entry_date);

CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY,
    actor_id    UUID,
    action      VARCHAR(40)  NOT NULL,
    detail      VARCHAR(255),
    ip          VARCHAR(45),
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX idx_audit_created ON audit_logs (created_at);
CREATE INDEX idx_audit_actor ON audit_logs (actor_id);
