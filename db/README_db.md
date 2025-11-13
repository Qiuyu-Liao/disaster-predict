# Disaster Management System – Database

## How to create

1. Open **MySQL Workbench**.
2. Connect to `root@localhost:3306`.
3. Open and run `db/schema.sql`.

## Database

- Database: `disaster_db`

## Tables

### 1. `disaster_events`
- Stores earthquakes and hurricanes fetched from USGS (earthquake) and NASA EONET (hurricane).
- `event_time`: JavaScript timestamp in **milliseconds** (same as frontend).
- `source` : `'USGS'` or `'EONET'`.
- `disaster_type` : `'earthquake'` or `'hurricane'`.
- Unique key `(source, source_id)` avoids duplicate records.
- Indexed by time / type / region for faster query.

### 2. `api_fetch_log`
- Records each time we call external APIs.
- Fields:
  - `source` (`USGS` or `EONET`)
  - `disaster_type` (`earthquake` / `hurricane`)
  - `region` (e.g. `usa`, `japan`)
  - `fetched` (how many events were inserted/updated)

### 3. `users`
- Stores registered users for login.
- `password_hash` is an encrypted password (bcrypt hash), **not** plain text.

## Backend env example

See `server/.env.example` for database connection settings.
