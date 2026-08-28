-- Migration: Update all sections default in permisos JSONB for profiles and miembros_equipo
-- File: supabase/migrations/20260907000000_update_all_sections_permissions_default.sql

-- 1. Actualizar el valor por defecto de la columna permisos en miembros_equipo con las 20 secciones completas
ALTER TABLE public.miembros_equipo ALTER COLUMN permisos SET DEFAULT '{
  "empresas": true,
  "equipo": true,
  "programa": true,
  "capacitacion": true,
  "capacitaciones_online": true,
  "correctivas": true,
  "accidentes": true,
  "matriz_riesgos": true,
  "extintores": true,
  "control_electrico": true,
  "visitas": true,
  "avisos": true,
  "checklist_personalizados": true,
  "protocolo_iluminacion": true,
  "protocolo_ruido": true,
  "protocolo_ergonomia": true,
  "protocolo_puesta_a_tierra": true,
  "legajo": true,
  "nomina": true,
  "facturacion": true
}'::jsonb;

-- 2. Actualizar el valor por defecto de la columna permisos en profiles con las 20 secciones completas
ALTER TABLE public.profiles ALTER COLUMN permisos SET DEFAULT '{
  "empresas": true,
  "equipo": true,
  "programa": true,
  "capacitacion": true,
  "capacitaciones_online": true,
  "correctivas": true,
  "accidentes": true,
  "matriz_riesgos": true,
  "extintores": true,
  "control_electrico": true,
  "visitas": true,
  "avisos": true,
  "checklist_personalizados": true,
  "protocolo_iluminacion": true,
  "protocolo_ruido": true,
  "protocolo_ergonomia": true,
  "protocolo_puesta_a_tierra": true,
  "legajo": true,
  "nomina": true,
  "facturacion": true
}'::jsonb;

-- 3. Backfill seguro para perfiles existentes (asegurando que administradores y miembros con permisos mantengan todas las claves)
UPDATE public.profiles
SET permisos = COALESCE(permisos, '{}'::jsonb) || '{
  "capacitaciones_online": true,
  "facturacion": true
}'::jsonb
WHERE role IN ('owner', 'admin') OR permisos IS NOT NULL;

-- 4. Backfill seguro para miembros_equipo existentes
UPDATE public.miembros_equipo
SET permisos = COALESCE(permisos, '{}'::jsonb) || '{
  "capacitaciones_online": true,
  "facturacion": true
}'::jsonb
WHERE permisos IS NOT NULL;
