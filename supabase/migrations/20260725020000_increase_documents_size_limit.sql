-- Migration: Increase documents bucket size limit to 10 MB (SEC-004-ADJUST)
-- File: supabase/migrations/20260725020000_increase_documents_size_limit.sql

UPDATE storage.buckets 
SET file_size_limit = 10485760 -- 10 MB
WHERE id = 'documents';

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
