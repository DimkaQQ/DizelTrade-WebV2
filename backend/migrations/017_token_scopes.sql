-- Migration 017: Add scope column to api_tokens
-- scope values: 'read' (GET only), 'write' (read + POST/PUT/PATCH), 'full' (everything)
ALTER TABLE api_tokens ADD COLUMN IF NOT EXISTS scope VARCHAR(20) DEFAULT 'full' NOT NULL;
