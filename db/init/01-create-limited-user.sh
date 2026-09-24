#!/bin/bash
set -e

# Cria um usuário de aplicação sem privilégios de DDL (não pode DROP/CREATE/ALTER, pois não é owner)
# Usa o superuser "postgres" pois "$POSTGRESQL_USERNAME" não tem o atributo CREATEROLE
export PGPASSWORD="${POSTGRESQL_POSTGRES_PASSWORD}"
psql -v ON_ERROR_STOP=1 \
	-v database_name="$POSTGRESQL_DATABASE" \
	-v admin_username="$POSTGRESQL_USERNAME" \
	-v limited_username="$LIMITED_DB_USERNAME" \
	-v limited_password="$LIMITED_DB_PASSWORD" \
	--username postgres \
	--dbname "$POSTGRESQL_DATABASE" <<-'EOSQL'
	SELECT format('CREATE ROLE %I WITH LOGIN PASSWORD %L', :'limited_username', :'limited_password')
	WHERE NOT EXISTS (
		SELECT 1 FROM pg_roles WHERE rolname = :'limited_username'
	) \gexec

	SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', :'limited_username', :'limited_password') \gexec

	GRANT CONNECT ON DATABASE :"database_name" TO :"limited_username";
	GRANT USAGE ON SCHEMA public TO :"limited_username";
	GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"limited_username";
	GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :"limited_username";
	ALTER DEFAULT PRIVILEGES FOR ROLE :"admin_username" IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"limited_username";
	ALTER DEFAULT PRIVILEGES FOR ROLE :"admin_username" IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO :"limited_username";
EOSQL
