-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create initial schema
CREATE SCHEMA IF NOT EXISTS scogen;

-- Set search path
SET search_path TO scogen, public;

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'Scogen database initialized with pgvector extension';
END $$;
