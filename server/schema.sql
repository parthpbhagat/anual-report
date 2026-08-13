-- Supabase Database Schema & Migration for BSE Annual Reports Finder

-- 1. Create / Update Companies Table with TEXT columns
CREATE TABLE IF NOT EXISTS companies (
    scrip_code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    symbol TEXT,
    last_synced TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Update existing column types if table already exists
ALTER TABLE companies ALTER COLUMN scrip_code TYPE TEXT;
ALTER TABLE companies ALTER COLUMN name TYPE TEXT;
ALTER TABLE companies ALTER COLUMN symbol TYPE TEXT;

-- 2. Create / Update Annual Reports Table
CREATE TABLE IF NOT EXISTS annual_reports (
    id BIGSERIAL PRIMARY KEY,
    scrip_code TEXT REFERENCES companies(scrip_code) ON DELETE CASCADE,
    year TEXT NOT NULL,
    file_name TEXT,
    raw_date TEXT,
    pdf_url TEXT NOT NULL,
    direct_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_company_year_pdf UNIQUE(scrip_code, year, direct_url)
);

ALTER TABLE annual_reports ALTER COLUMN scrip_code TYPE TEXT;
ALTER TABLE annual_reports ALTER COLUMN year TYPE TEXT;

-- 3. Create Index
CREATE INDEX IF NOT EXISTS idx_annual_reports_scrip_code ON annual_reports(scrip_code);
