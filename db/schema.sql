CREATE DATABASE IF NOT EXISTS disaster_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE disaster_db;

CREATE TABLE IF NOT EXISTS disaster_events (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  source_id     VARCHAR(100) NOT NULL,               
  source        ENUM('USGS','EONET') NOT NULL,       
  disaster_type ENUM('earthquake','hurricane') NOT NULL,

  title         VARCHAR(255),
  magnitude     FLOAT NULL,                         
  event_time    BIGINT,                              
  url           VARCHAR(255),

  lat           DOUBLE,
  lng           DOUBLE,
  region        VARCHAR(50) NULL,                    
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uniq_event (source, source_id),         
  INDEX idx_time (event_time),
  INDEX idx_type_time (disaster_type, event_time),
  INDEX idx_region_time (region, event_time)
);