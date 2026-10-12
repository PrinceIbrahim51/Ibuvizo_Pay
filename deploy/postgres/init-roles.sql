-- Least-privilege database setup for IBUVIO Pay. Run once as a superuser:
--   psql -v owner_pw="'...'" -v app_pw="'...'" -f init-roles.sql
-- ibuvio_owner : owns the schema, used ONLY by Flyway migrations (FLYWAY_USER / FLYWAY_PASSWORD)
-- ibuvio_app   : used by the running API (DB_USERNAME / DB_PASSWORD). Can read/write rows, cannot
--                change the schema, and cannot modify or delete audit log entries.

CREATE ROLE ibuvio_owner LOGIN PASSWORD :owner_pw;
CREATE ROLE ibuvio_app LOGIN PASSWORD :app_pw CONNECTION LIMIT 50;

CREATE DATABASE ibuvio OWNER ibuvio_owner;
REVOKE ALL ON DATABASE ibuvio FROM PUBLIC;
GRANT CONNECT ON DATABASE ibuvio TO ibuvio_app;

\connect ibuvio

REVOKE ALL ON SCHEMA public FROM PUBLIC;
ALTER SCHEMA public OWNER TO ibuvio_owner;
GRANT USAGE ON SCHEMA public TO ibuvio_app;

-- Every table Flyway creates later is automatically readable/writable by the app role...
ALTER DEFAULT PRIVILEGES FOR ROLE ibuvio_owner IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ibuvio_app;
ALTER DEFAULT PRIVILEGES FOR ROLE ibuvio_owner IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO ibuvio_app;
