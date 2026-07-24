-- Migration: Add remaining brand colors and text contrasts to tenants table
-- Description: Adds primary_color_text, secondary_color_text, hover_color, and hover_color_text columns to the public.tenants table.

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS primary_color_text VARCHAR(7) DEFAULT '#FFFFFF';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS secondary_color_text VARCHAR(7) DEFAULT '#FFFFFF';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS hover_color VARCHAR(7) DEFAULT '#0511F2';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS hover_color_text VARCHAR(7) DEFAULT '#FFFFFF';

-- Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';
