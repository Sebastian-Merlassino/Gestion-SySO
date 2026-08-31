-- Migration: Soporte para Comprobante / Remito Interno (X) en Facturas
-- File: supabase/migrations/20260907000000_add_comprobante_interno.sql

ALTER TABLE public.facturas
  DROP CONSTRAINT IF EXISTS facturas_tipo_comprobante_check;

ALTER TABLE public.facturas
  ADD CONSTRAINT facturas_tipo_comprobante_check
  CHECK (tipo_comprobante IN (1, 2, 3, 6, 7, 8, 11, 12, 13, 99));

COMMENT ON COLUMN public.facturas.tipo_comprobante IS '1=Factura A, 6=Factura B, 11=Factura C, 2/7/12=ND, 3/8/13=NC, 99=Comprobante Interno X';
