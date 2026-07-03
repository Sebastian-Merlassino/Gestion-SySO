-- Migration: Storage Buckets Security Hardening (SEC-004)
-- File: supabase/migrations/20260725010000_storage_security_hardening.sql

-- 1. Apply size and MIME type constraints to the 'documents' bucket
UPDATE storage.buckets 
SET file_size_limit = 5242880, -- 5 MB
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']::text[]
WHERE id = 'documents';

-- 2. Apply size and MIME type constraints to the 'signatures' bucket
UPDATE storage.buckets 
SET file_size_limit = 2097152, -- 2 MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
WHERE id = 'signatures';

-- 3. Apply size and MIME type constraints to the 'logos' bucket (for safety)
UPDATE storage.buckets 
SET file_size_limit = 2097152, -- 2 MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
WHERE id = 'logos';

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
