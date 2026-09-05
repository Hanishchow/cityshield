-- PostGIS DDL for the Bengaluru emergency-response incident store.
-- Every table maps 1:1 to a domain type; no ORM, no migrations tool.

CREATE EXTENSION IF NOT EXISTS postgis;

-- Core incident record. One row per citizen report; agencies attach tasks to it.
CREATE TABLE IF NOT EXISTS incidents (
  id          text PRIMARY KEY,
  state       text NOT NULL DEFAULT 'submitted',
  category    text NOT NULL DEFAULT 'unknown',
  severity    text NOT NULL DEFAULT 'urgent',
  description text,
  sos         boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Location pings over time. Each row is one GPS/network fix tied to an incident.
CREATE TABLE IF NOT EXISTS incident_pings (
  id           bigserial PRIMARY KEY,
  incident_id  text NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  geog         geography(Point, 4326) NOT NULL,
  accuracy_m   double precision,
  source       text,
  at           timestamptz NOT NULL DEFAULT now()
);

-- Agency task assignments. Composite PK keeps one row per agency per incident.
CREATE TABLE IF NOT EXISTS incident_tasks (
  incident_id text NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  agency      text NOT NULL,
  role        text,
  state       text,
  unit        text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  simulated   boolean NOT NULL DEFAULT false,
  PRIMARY KEY (incident_id, agency)
);

-- State-change log. Append-only; the last row for an incident is its current state.
CREATE TABLE IF NOT EXISTS incident_timeline (
  id           bigserial PRIMARY KEY,
  incident_id  text NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  state        text NOT NULL,
  at           timestamptz NOT NULL DEFAULT now()
);

-- BBMP ward polygons for spatial queries (point-in-ward).
-- MultiPolygon, not Polygon: real BBMP ward geometry includes wards split by
-- lakes and defence land, and a Polygon column rejects those outright on load.
CREATE TABLE IF NOT EXISTS wards (
  id        text PRIMARY KEY,
  name      text,
  number    int,
  boundary  geography(MultiPolygon, 4326) NOT NULL
);

-- Spatial index for nearest-ping and radius queries.
CREATE INDEX IF NOT EXISTS idx_incident_pings_geog ON incident_pings USING GIST (geog);

-- Spatial index for point-in-ward lookups.
CREATE INDEX IF NOT EXISTS idx_wards_boundary ON wards USING GIST (boundary);

-- Composite index for fetching pings ordered by time within an incident.
CREATE INDEX IF NOT EXISTS idx_incident_pings_incident_at ON incident_pings (incident_id, at);
