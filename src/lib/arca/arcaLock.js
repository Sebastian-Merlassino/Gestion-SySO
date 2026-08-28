// src/lib/arca/arcaLock.js
// Optimistic locking helper for preventing double invoice submission

import { v4 as uuidv4 } from 'crypto';

/**
 * Lock TTL in minutes. If a lock is older than this, it's considered stale
 * and another process can take it.
 */
const LOCK_TTL_MINUTES = 5;

/**
 * Maximum processing attempts before refusing to retry
 */
const MAX_PROCESSING_ATTEMPTS = 3;

/**
 * Generates a unique lock ID for the current processing attempt
 */
export function generateLockId() {
  return crypto.randomUUID();
}

/**
 * Attempts to acquire a processing lock on an invoice.
 * Uses optimistic locking: the UPDATE only succeeds if no other process
 * currently holds the lock.
 * 
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseClient
 * @param {string} facturaId - Invoice ID to lock
 * @param {string} lockId - Unique lock ID for this processing attempt
 * @returns {Promise<{success: boolean, error?: string, factura?: Object}>}
 */
export async function acquireLock(supabaseClient, facturaId, lockId) {
  const now = new Date().toISOString();
  const staleCutoff = new Date(Date.now() - LOCK_TTL_MINUTES * 60 * 1000).toISOString();

  // First, check current state and attempts
  const { data: current, error: fetchError } = await supabaseClient
    .from('facturas')
    .select('estado, processing_lock_id, processing_lock_at, processing_attempts')
    .eq('id', facturaId)
    .single();

  if (fetchError || !current) {
    return { success: false, error: 'Factura no encontrada.' };
  }

  // Check if it's in a lockable state
  if (!['borrador', 'error_conexion'].includes(current.estado)) {
    if (current.estado === 'pendiente') {
      // Check if the existing lock is stale
      if (current.processing_lock_at && current.processing_lock_at < staleCutoff) {
        // Stale lock — we can take it, fall through
      } else {
        return { success: false, error: 'Esta factura ya está siendo procesada por otra operación. Intente nuevamente en unos minutos.' };
      }
    } else if (current.estado === 'autorizada') {
      return { success: false, error: 'Esta factura ya fue autorizada por ARCA.' };
    } else {
      return { success: false, error: `Esta factura no puede ser emitida en su estado actual: ${current.estado}.` };
    }
  }

  // Check max attempts
  if (current.processing_attempts >= MAX_PROCESSING_ATTEMPTS) {
    return { success: false, error: `Se alcanzó el límite máximo de ${MAX_PROCESSING_ATTEMPTS} intentos de emisión. Use la función de reconciliación para verificar el estado en ARCA.` };
  }

  // Attempt to acquire the lock via conditional UPDATE
  const { data: updated, error: updateError } = await supabaseClient
    .from('facturas')
    .update({
      estado: 'pendiente',
      processing_lock_id: lockId,
      processing_lock_at: now,
      processing_attempts: (current.processing_attempts || 0) + 1,
    })
    .eq('id', facturaId)
    .in('estado', ['borrador', 'error_conexion', 'pendiente']) // Allow taking stale 'pendiente' locks
    .select()
    .single();

  if (updateError || !updated) {
    return { success: false, error: 'No se pudo adquirir el lock de procesamiento. Otro proceso puede estar emitiendo esta factura.' };
  }

  return { success: true, factura: updated };
}

/**
 * Releases the processing lock on an invoice and updates its state.
 * 
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseClient
 * @param {string} facturaId - Invoice ID
 * @param {string} lockId - The lock ID that was acquired
 * @param {Object} updateData - Data to update on the invoice
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function releaseLock(supabaseClient, facturaId, lockId, updateData) {
  const { error } = await supabaseClient
    .from('facturas')
    .update({
      ...updateData,
      processing_lock_id: null,
      processing_lock_at: null,
    })
    .eq('id', facturaId)
    .eq('processing_lock_id', lockId); // Only release if we still hold the lock

  if (error) {
    console.error('[ARCA Lock] Error al liberar lock:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}
