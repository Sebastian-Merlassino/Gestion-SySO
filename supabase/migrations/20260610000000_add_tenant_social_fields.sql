-- 20260610000000_add_tenant_social_fields.sql
-- Agregar columnas opcionales de redes sociales y página web a la tabla de Tenants

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS social_linkedin TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS social_instagram TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS social_facebook TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS social_tiktok TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS social_youtube TEXT;
