# ADR-0002: Gestión de Datos Geográficos en Base de Datos (Supabase)

* **Estado**: Propuesto
* **Fecha**: 2026-06-13
* **Autor**: Antigravity (Arquitecto de Plataforma)

---

## Contexto y Problema

El listado de Provincias, Departamentos/Partidos y Localidades/Barrios de Argentina se almacena actualmente en un archivo JSON local estático de aproximadamente 400 KB (`src/data/localidades_agrupado.json`). Este archivo se importa directamente en componentes de cliente Next.js (`'use client'`) en el Onboarding y Perfil.

Esta implementación presenta tres problemas fundamentales:
1. **Rendimiento**: Agrega 400 KB de código estático redundante al bundle de JavaScript del navegador, demorando la carga inicial en móviles y conexiones lentas.
2. **Incompleto**: Faltan departamentos y localidades específicas. Modificar un archivo JSON local requiere realizar un commit en Git, volver a compilar el proyecto y realizar un deploy de toda la aplicación.
3. **Redundancia Operativa**: Existe un script heredado de migración para Firestore (`migrateGeography.js`), pero la base de datos principal activa del backend de la plataforma es Supabase (PostgreSQL).

---

## Decisión Propuesta

1. **Tabla de Base de Datos**: Mover todos los registros de geografía a una tabla de Supabase llamada `public.geografia`.
2. **Consultas Dinámicas**: Modificar los formularios del frontend para que consulten de forma asíncrona y jerárquica a Supabase (ej. cargar provincias en el montaje, y cargar localidades filtradas por provincia solo cuando el usuario haga clic o cambie la provincia).
3. **Eliminación del Archivo Local**: Eliminar `localidades_agrupado.json` del código fuente para limpiar los bundles.
4. **Eliminación del Script de Firebase**: Eliminar `migrateGeography.js` que ya no es compatible.

---

## Consecuencias

### Positivas
* **Optimización de Bundle**: Reducción del bundle size de Next.js en unos 400 KB, logrando tiempos de carga del dashboard, perfil y registro mucho más rápidos.
* **Mantenibilidad en Caliente**: Si falta una localidad o departamento en el futuro, se puede agregar directamente insertando una fila en la base de datos (mediante SQL o la consola de Supabase), sin necesidad de compilar ni redesplegar la aplicación.
* **Escalabilidad**: Abre las puertas a soportar catálogos geográficos de múltiples países sin sobrecargar el código de la app.

### Negativas / Retos
* **Dependencia de Red**: Cada cambio de provincia generará una pequeña petición HTTP a Supabase. Sin embargo, al estar indexada y ser de lectura pública (RLS `true`), la respuesta será menor a 15ms y amortizable mediante caché del cliente.
