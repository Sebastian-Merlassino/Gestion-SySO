// src/components/ui/AppSendModal.js
'use client';

import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Send, Mail, MessageCircle, X, Loader2 } from 'lucide-react';
import AppButton from './AppButton';

/**
 * AppSendModal - Diálogo estándar unificado para despacho de reportes por Email y WhatsApp
 * 
 * Cumple con el estándar de diseño de Gestión SySO (Radix UI, Backdrop blur, Tailwind y accesibilidad).
 */
export default function AppSendModal({
  open,
  isOpen,
  onClose,
  onOpenChange,
  title = 'Enviar Reporte (PDF)',
  subtitle,
  activeTab: controlledActiveTab,
  onTabChange,
  
  // Email props
  availableEmails = [],
  setAvailableEmails,
  onToggleEmail,
  manualEmail = '',
  setManualEmail,
  onManualEmailChange,
  onSendEmail,
  isEmailLoading = false,
  mailLoading,
  emailInfoText = 'Seleccione los contactos registrados de la empresa o ingrese correos electrónicos manualmente (separados por comas) para enviar el reporte en PDF.',
  emailEmptyText = 'No hay contactos registrados para esta empresa.',
  
  // WhatsApp props
  availablePhones = [],
  setAvailablePhones,
  onTogglePhone,
  manualPhone = '',
  setManualPhone,
  onManualPhoneChange,
  onSendWhatsApp,
  isWhatsappLoading = false,
  whatsappLoading,
  whatsappInfoText = 'Seleccione un contacto registrado de la empresa o ingrese un número manualmente para compartir el reporte. Se generará un enlace seguro de descarga.',
  whatsappEmptyText = 'No hay contactos con teléfono registrados.'
}) {
  const isActuallyOpen = open !== undefined ? open : (isOpen || false);
  const [internalTab, setInternalTab] = useState('email');
  
  const currentTab = controlledActiveTab !== undefined ? controlledActiveTab : internalTab;
  const effectiveEmailLoading = mailLoading !== undefined ? mailLoading : isEmailLoading;
  const effectiveWhatsappLoading = whatsappLoading !== undefined ? whatsappLoading : isWhatsappLoading;

  const handleTabSelect = (tab) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  const handleClose = () => {
    if (onOpenChange) onOpenChange(false);
    if (onClose) onClose();
  };

  const handleOpenChange = (nextOpen) => {
    if (onOpenChange) onOpenChange(nextOpen);
    if (!nextOpen && onClose) {
      onClose();
    }
  };

  const handleEmailCheckboxToggle = (index) => {
    if (onToggleEmail) {
      onToggleEmail(index);
    } else if (setAvailableEmails) {
      setAvailableEmails(prev =>
        prev.map((item, i) => (i === index ? { ...item, checked: !item.checked } : item))
      );
    }
  };

  const handlePhoneCheckboxToggle = (index) => {
    if (onTogglePhone) {
      onTogglePhone(index);
    } else if (setAvailablePhones) {
      // WhatsApp envía a un destinatario a la vez: desmarca los demás
      setAvailablePhones(prev =>
        prev.map((item, i) =>
          i === index ? { ...item, checked: !item.checked } : { ...item, checked: false }
        )
      );
    }
  };

  const handleManualEmailInput = (e) => {
    const val = e.target.value;
    if (onManualEmailChange) {
      onManualEmailChange(val);
    } else if (setManualEmail) {
      setManualEmail(val);
    }
  };

  const handleManualPhoneInput = (e) => {
    const val = e.target.value;
    if (onManualPhoneChange) {
      onManualPhoneChange(val);
    } else if (setManualPhone) {
      setManualPhone(val);
    }
  };

  return (
    <Dialog.Root open={isActuallyOpen} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        {/* Backdrop con desenfoque suave */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm animate-fade-in" />

        {/* Contenedor del Modal Centrado */}
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <Dialog.Content
            onPointerDownOutside={(e) => {
              if (effectiveEmailLoading || effectiveWhatsappLoading) {
                e.preventDefault();
              } else {
                handleClose();
              }
            }}
            onInteractOutside={(e) => {
              if (effectiveEmailLoading || effectiveWhatsappLoading) {
                e.preventDefault();
              } else {
                handleClose();
              }
            }}
            className="relative w-full max-w-md p-5 sm:p-6 bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl shadow-2xl animate-scale-up focus:outline-none space-y-4 max-h-[90vh] overflow-y-auto sm:max-h-none"
          >
            {/* Cabecera del Modal */}
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-[#468DFF] rounded-xl shrink-0">
                  <Send className="h-4.5 w-4.5" />
                </div>
                <div>
                  <Dialog.Title className="font-outfit text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                    {title}
                  </Dialog.Title>
                  {subtitle && (
                    <Dialog.Description className="text-[11px] text-slate-500 font-medium truncate max-w-[260px]">
                      {subtitle}
                    </Dialog.Description>
                  )}
                </div>
              </div>

              {/* Botón de Cierre "X" Accesible */}
              <Dialog.Close asChild>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={effectiveEmailLoading || effectiveWhatsappLoading}
                  className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#468DFF] cursor-pointer disabled:opacity-50"
                  aria-label="Cerrar ventana"
                >
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            {/* Selector de Pestañas (Tabs) */}
            <div className="flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => handleTabSelect('email')}
                className={`flex-1 pb-2.5 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
                  currentTab === 'email'
                    ? 'border-[#468DFF] text-[#468DFF]'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <Mail className="h-3.5 w-3.5" />
                Correo Electrónico
              </button>

              <button
                type="button"
                onClick={() => handleTabSelect('whatsapp')}
                className={`flex-1 pb-2.5 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
                  currentTab === 'whatsapp'
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </button>
            </div>

            {/* CONTENIDO DE LA PESTAÑA: CORREO ELECTRÓNICO */}
            {currentTab === 'email' ? (
              <div className="space-y-4 animate-fade-in">
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  {emailInfoText}
                </p>

                <div className="space-y-3">
                  {/* Lista de Correos Registrados */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Correos de la Empresa:
                    </label>
                    {availableEmails.length === 0 ? (
                      <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
                        <p className="text-xs text-slate-400 italic font-semibold">
                          {emailEmptyText}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-slate-50 p-2.5 border border-slate-200 rounded-xl max-h-36 overflow-y-auto space-y-1 scrollbar-thin">
                        {availableEmails.map((e, idx) => (
                          <label
                            key={idx}
                            className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-100/70 p-1.5 rounded-lg transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(e.checked)}
                              onChange={() => handleEmailCheckboxToggle(idx)}
                              className="accent-[#468DFF] h-4 w-4 rounded cursor-pointer shrink-0"
                            />
                            <span className="truncate">{e.descripcion || e.valor}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Campo de Correos Manuales */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Correos Manuales:
                    </label>
                    <textarea
                      rows={2}
                      placeholder="ejemplo1@correo.com, ejemplo2@correo.com..."
                      value={manualEmail}
                      onChange={handleManualEmailInput}
                      disabled={effectiveEmailLoading}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] bg-slate-50/50 font-medium resize-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Acciones de la Pestaña Correo */}
                <div className="flex justify-end gap-2.5 pt-2">
                  <Dialog.Close asChild>
                    <AppButton
                      type="button"
                      variant="outline"
                      size="md"
                      disabled={effectiveEmailLoading}
                      onClick={handleClose}
                    >
                      Cancelar
                    </AppButton>
                  </Dialog.Close>

                  <AppButton
                    type="button"
                    variant="primary"
                    size="md"
                    disabled={effectiveEmailLoading}
                    onClick={onSendEmail}
                    className="flex items-center gap-1.5 shadow-md shadow-[#468DFF]/15 min-w-[130px] justify-center"
                  >
                    {effectiveEmailLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        Enviar Correo
                      </>
                    )}
                  </AppButton>
                </div>
              </div>
            ) : (
              /* CONTENIDO DE LA PESTAÑA: WHATSAPP */
              <div className="space-y-4 animate-fade-in">
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  {whatsappInfoText}
                </p>

                <div className="space-y-3">
                  {/* Lista de Teléfonos Registrados */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Teléfonos de la Empresa:
                    </label>
                    {availablePhones.length === 0 ? (
                      <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
                        <p className="text-xs text-slate-400 italic font-semibold">
                          {whatsappEmptyText}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-slate-50 p-2.5 border border-slate-200 rounded-xl max-h-36 overflow-y-auto space-y-1 scrollbar-thin">
                        {availablePhones.map((p, idx) => (
                          <label
                            key={idx}
                            className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-100/70 p-1.5 rounded-lg transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(p.checked)}
                              onChange={() => handlePhoneCheckboxToggle(idx)}
                              className="accent-green-600 h-4 w-4 rounded cursor-pointer shrink-0"
                            />
                            <span className="truncate">{p.descripcion || p.valor}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Campo de Teléfono Manual */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Número Manual (ej: 5491159969956):
                    </label>
                    <input
                      type="text"
                      placeholder="Código de país + área + número (sin espacios ni guiones)"
                      value={manualPhone}
                      onChange={handleManualPhoneInput}
                      disabled={effectiveWhatsappLoading}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 bg-slate-50/50 font-medium transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Acciones de la Pestaña WhatsApp */}
                <div className="flex justify-end gap-2.5 pt-2">
                  <Dialog.Close asChild>
                    <AppButton
                      type="button"
                      variant="outline"
                      size="md"
                      disabled={effectiveWhatsappLoading}
                      onClick={handleClose}
                    >
                      Cancelar
                    </AppButton>
                  </Dialog.Close>

                  <button
                    type="button"
                    disabled={effectiveWhatsappLoading}
                    onClick={onSendWhatsApp}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-md shadow-green-600/15 disabled:bg-slate-400 disabled:cursor-not-allowed min-w-[150px] justify-center"
                  >
                    {effectiveWhatsappLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <MessageCircle className="h-3.5 w-3.5" />
                        Enviar por WhatsApp
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
