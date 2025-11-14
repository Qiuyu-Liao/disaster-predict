# Disaster Management System – Database Setup

## How to Create
Open **MySQL Workbench**, connect to `root@localhost:3306`, and run:
- `db/schema.sql`

## Database Info
- Database: `disaster_db`
- Table: `disaster_events`
- Time unit: milliseconds (aligns with frontend)
- Unique key: `(source, source_id)`
- Magnitude: NULL allowed for hurricanes

## .env Example (for backend)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=disaster_db
PORT=3000