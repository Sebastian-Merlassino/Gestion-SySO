-- 20260610010000_adjust_plans_constraint.sql
-- Modificar la restricción check de plan_id en public.tenants para el nuevo modelo de planes

-- 1. Eliminar la restricción check anterior
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS plan_check;

-- 2. Modificar el valor por defecto de plan_id a 'free' (Plan gratis permanente para 1 cliente)
ALTER TABLE public.tenants ALTER COLUMN plan_id SET DEFAULT 'free';

-- 3. Crear la nueva restricción con los nuevos planes
ALTER TABLE public.tenants ADD CONSTRAINT plan_check CHECK (plan_id IN ('free', 'basic_5', 'standard_25', 'libre'));
