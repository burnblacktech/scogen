-- Migration 006: Add PDF Error Tracking and Document Format
-- Adds a format column to document_generations for tracking PDF/HTML formats
-- Part of PDF generation error handling implementation

-- Note: pdf_generation_errors table moved to migration 005
-- This migration only adds the format column for HTML fallback tracking

-- Add format column to document_generations table if it doesn't exist
-- This column tracks whether document is 'pdf' or 'html' (fallback)
-- Note: Migration helper will check column existence before adding

