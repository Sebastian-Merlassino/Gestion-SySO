-- 20260612000000_add_profile_self_select.sql
-- Permitir a los usuarios seleccionar su propio perfil sin depender de si ya tienen tenant_id asociado.
-- Esto soluciona problemas en el Onboarding y en la carga inicial del perfil.

CREATE POLICY profile_self_select ON public.profiles
    FOR SELECT
    USING (id = auth.uid());
