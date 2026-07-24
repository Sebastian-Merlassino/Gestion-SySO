-- Migration: Add custom brand colors and social_x to tenants table
-- Description: Adds primary_color, secondary_color, and social_x columns to the public.tenants table.

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#468DFF';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7) DEFAULT '#0D0D0D';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS social_x TEXT;

-- Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';
