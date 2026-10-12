-- Audit log is append-only for the application role: no edits, no deletes (tamper resistance).
-- The role only exists in environments set up with deploy/postgres/init-roles.sql, hence the guard.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ibuvio_app') THEN
        REVOKE UPDATE, DELETE ON audit_logs FROM ibuvio_app;
    END IF;
END
$$;
