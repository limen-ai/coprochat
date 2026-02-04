-- CoproChat Analytics Schema
-- Run this in your Neon/Vercel Postgres dashboard

-- Main request logging table
CREATE TABLE IF NOT EXISTS requests (
  id SERIAL PRIMARY KEY,
  ip_hash VARCHAR(64) NOT NULL,
  country VARCHAR(100),
  region VARCHAR(100),
  city VARCHAR(100),
  bs_level VARCHAR(20),
  input_length INTEGER,
  injection_flag BOOLEAN DEFAULT FALSE,
  error_flag BOOLEAN DEFAULT FALSE,
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at);
CREATE INDEX IF NOT EXISTS idx_requests_ip_hash ON requests(ip_hash);
CREATE INDEX IF NOT EXISTS idx_requests_injection ON requests(injection_flag) WHERE injection_flag = TRUE;

-- Alert log table
CREATE TABLE IF NOT EXISTS alert_log (
  id SERIAL PRIMARY KEY,
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  details JSONB,
  sent_to VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alert_log_type ON alert_log(alert_type, created_at);

-- Optional: Daily stats aggregation (for faster dashboards at scale)
CREATE TABLE IF NOT EXISTS daily_stats (
  date DATE PRIMARY KEY,
  total_requests INTEGER DEFAULT 0,
  unique_ips INTEGER DEFAULT 0,
  injection_attempts INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER,
  top_countries JSONB,
  top_cities JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
