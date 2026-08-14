-- Migration: Agregar restricción UNIQUE a payment_id en pagos_procesados para idempotencia atómica
-- File: supabase/migrations/20260826000000_add_unique_to_pagos_procesados.sql

DO $$
BEGIN
    -- Verificar si la restricción UNIQUE en payment_id ya existe
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'unique_payment_id'
    ) THEN
        -- Eliminar duplicados históricos en pagos_procesados si existieran (conservando la fila más antigua)
        DELETE FROM public.pagos_procesados p1
        USING public.pagos_procesados p2
        WHERE p1.payment_id = p2.payment_id
          AND p1.created_at > p2.created_at;

        -- Añadir la restricción UNIQUE a nivel de base de datos
        ALTER TABLE public.pagos_procesados 
        ADD CONSTRAINT unique_payment_id UNIQUE (payment_id);
    END IF;
END $$;
