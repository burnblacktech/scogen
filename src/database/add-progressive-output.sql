-- Progressive Output System Migration
-- Adds columns for storing complete analysis and tracking output levels

-- Add complete_analysis column to store full internal analysis (JSON)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS complete_analysis TEXT;

-- Add output_level column to track current output level
ALTER TABLE projects ADD COLUMN IF NOT EXISTS output_level TEXT DEFAULT 'L1_DISCOVERY';

-- Add level_upgrades column to track upgrade history (JSON array)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS level_upgrades TEXT;

-- Add is_training_mode column to flag training mode projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_training_mode BOOLEAN DEFAULT 0;

-- Create index on output_level for faster queries
CREATE INDEX IF NOT EXISTS idx_projects_output_level ON projects(output_level);

