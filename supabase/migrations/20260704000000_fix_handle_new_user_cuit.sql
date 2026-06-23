-- Migration: Fix handle_new_user trigger cuit constraint failure
-- File: supabase/migrations/20260704000000_fix_handle_new_user_cuit.sql

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, tenant_id, empresa_id, cuit)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', ''), 
    COALESCE(new.raw_user_meta_data->>'role', 'miembro'),
    (new.raw_user_meta_data->>'tenant_id')::uuid,
    (new.raw_user_meta_data->>'empresa_id')::uuid,
    NULLIF(new.raw_user_meta_data->>'cuit', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recargar el caché del esquema de PostgREST
NOTIFY pgrst, 'reload schema';
