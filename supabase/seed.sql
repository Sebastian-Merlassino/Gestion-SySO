-- seed.sql
-- Datos iniciales para pruebas locales en Gestión SySO

-- 1. Insertar Tenants de prueba
INSERT INTO public.tenants (id, slug, name, status) VALUES
('4a946b5d-ea82-411a-8bb7-eb1ffb2f567b', 'acme-industries', 'ACME Industries S.A.', 'active'),
('7b38dcd3-fb13-4318-8f83-9b6d859cebe0', 'construcciones-seguras', 'Construcciones Seguras Ltda.', 'trial')
ON CONFLICT (id) DO NOTHING;

-- 2. Insertar usuarios en auth.users para satisfacer las relaciones de clave foránea
-- La contraseña por defecto para todos será 'password123'
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at
) VALUES 
(
  'd290f1ee-6c54-4b01-90e6-d701748f0851', 
  '00000000-0000-0000-0000-000000000000', 
  'admin@acme.com', 
  crypt('password123', gen_salt('bf')), 
  now(), 
  '{"provider": "email", "providers": ["email"]}', 
  '{"full_name": "Carlos Gómez (Admin ACME)", "role": "admin", "tenant_id": "4a946b5d-ea82-411a-8bb7-eb1ffb2f567b"}', 
  'authenticated', 
  'authenticated', 
  now(), 
  now()
),
(
  'f3b92f7b-90f1-4db8-b4b3-d6c579198642', 
  '00000000-0000-0000-0000-000000000000', 
  'inspector@acme.com', 
  crypt('password123', gen_salt('bf')), 
  now(), 
  '{"provider": "email", "providers": ["email"]}', 
  '{"full_name": "María Rodríguez (Inspector ACME)", "role": "miembro", "tenant_id": "4a946b5d-ea82-411a-8bb7-eb1ffb2f567b"}', 
  'authenticated', 
  'authenticated', 
  now(), 
  now()
),
(
  'a60db2fa-671e-450f-a77a-428987b74488', 
  '00000000-0000-0000-0000-000000000000', 
  'supervisor@seguras.com', 
  crypt('password123', gen_salt('bf')), 
  now(), 
  '{"provider": "email", "providers": ["email"]}', 
  '{"full_name": "Juan Perez (Supervisor CS)", "role": "miembro", "tenant_id": "7b38dcd3-fb13-4318-8f83-9b6d859cebe0"}', 
  'authenticated', 
  'authenticated', 
  now(), 
  now()
)
ON CONFLICT (id) DO NOTHING;

-- 3. Insertar perfiles asociados a los Tenants
-- Nota: La inserción a auth.users dispara el trigger handle_new_user, pero hacemos un upsert para asegurar todos los campos correctos
INSERT INTO public.profiles (id, tenant_id, email, full_name, role) VALUES
('d290f1ee-6c54-4b01-90e6-d701748f0851', '4a946b5d-ea82-411a-8bb7-eb1ffb2f567b', 'admin@acme.com', 'Carlos Gómez (Admin ACME)', 'admin'),
('f3b92f7b-90f1-4db8-b4b3-d6c579198642', '4a946b5d-ea82-411a-8bb7-eb1ffb2f567b', 'inspector@acme.com', 'María Rodríguez (Inspector ACME)', 'miembro'),
('a60db2fa-671e-450f-a77a-428987b74488', '7b38dcd3-fb13-4318-8f83-9b6d859cebe0', 'supervisor@seguras.com', 'Juan Perez (Supervisor CS)', 'miembro')
ON CONFLICT (id) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id,
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- 4. Insertar auditorías simuladas
INSERT INTO public.audits (id, tenant_id, title, description, status, scheduled_at, created_by) VALUES
('1e18d6e3-5f0a-4a2c-a299-fb901e181e18', '4a946b5d-ea82-411a-8bb7-eb1ffb2f567b', 'Inspección General EPP Planta A', 'Inspección rutinaria de cascos, arneses y botas en la línea de montaje principal.', 'completed', '2026-06-05 09:00:00+00', 'f3b92f7b-90f1-4db8-b4b3-d6c579198642'),
('2f29e7f4-6a1b-5b3d-b300-0c212f292f29', '4a946b5d-ea82-411a-8bb7-eb1ffb2f567b', 'Auditoría de Higiene Industrial sector Pintura', 'Medición de gases y ventilación en el área de mezclado de pintura.', 'scheduled', '2026-06-15 14:00:00+00', 'd290f1ee-6c54-4b01-90e6-d701748f0851'),
('3e30f8a5-7b2c-6c4e-c400-1d323f303f30', '7b38dcd3-fb13-4318-8f83-9b6d859cebe0', 'Control de Andamios - Obra Torre Madero', 'Verificación estructural y líneas de vida en andamios colgantes.', 'in_progress', '2026-06-08 10:30:00+00', 'a60db2fa-671e-450f-a77a-428987b74488')
ON CONFLICT (id) DO NOTHING;
