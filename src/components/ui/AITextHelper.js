// src/components/ui/AITextHelper.js
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, Sparkles, Loader2, AlertCircle, Trash2 } from 'lucide-react';

export default function AITextHelper({ value, onChange, context = '', disabled = false }) {
  const [isListening, setIsListening] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [hasSpeechSupport, setHasSpeechSupport] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const recognitionRef = useRef(null);

  // Verificar soporte de Web Speech API
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        setHasSpeechSupport(true);
      }
    }
  }, []);

  // Inicializar o destruir el reconocimiento de voz
  const toggleListening = async () => {
    if (disabled || isRefining) return;

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      setErrorMessage('');

      // Forzar el popup de permisos del navegador usando getUserMedia
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Detener el stream de audio inmediatamente después de asegurar el permiso
          stream.getTracks().forEach(track => track.stop());
        } catch (err) {
          console.error('Permiso de micrófono denegado en getUserMedia:', err);
          let msg = 'Permiso de micrófono denegado.';
          if (typeof window !== 'undefined' && !window.isSecureContext) {
            msg = 'El micrófono requiere una conexión segura (HTTPS).';
          } else {
            try {
              if (navigator.permissions && navigator.permissions.query) {
                const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
                if (permissionStatus.state === 'denied') {
                  msg = 'Micrófono bloqueado. Habilitalo haciendo clic en el candado de la URL.';
                }
              }
            } catch (pErr) {
              console.error('Error consultando permisos:', pErr);
            }
          }
          setErrorMessage(msg);
          setIsListening(false);
          setTimeout(() => {
            setErrorMessage('');
          }, 6000);
          return;
        }
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = 'es-AR'; // Español de Argentina por defecto
      recognition.interimResults = false;
      recognition.continuous = false; // Se detiene al dejar de hablar
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          // Si ya hay texto, agregamos un espacio y el nuevo texto
          const newValue = value && value.trim() !== '' 
            ? `${value.trim()} ${transcript}` 
            : transcript;
          onChange(newValue);
        }
      };

      recognition.onerror = async (event) => {
        console.error('Error de Speech Recognition:', event.error);
        let msg = 'Error al capturar audio.';
        if (event.error === 'not-allowed') {
          if (typeof window !== 'undefined' && !window.isSecureContext) {
            msg = 'El micrófono requiere una conexión segura (HTTPS).';
          } else {
            msg = 'Permiso de micrófono denegado.';
            try {
              if (navigator.permissions && navigator.permissions.query) {
                const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
                if (permissionStatus.state === 'denied') {
                  msg = 'Micrófono bloqueado. Habilitalo haciendo clic en el candado de la URL.';
                }
              }
            } catch (pErr) {
              console.error('Error consultando permisos:', pErr);
            }
          }
        } else if (event.error === 'no-speech') {
          msg = 'No se detectó voz.';
        }
        setErrorMessage(msg);
        setIsListening(false);

        // Limpiar mensaje de error después de 5 segundos
        setTimeout(() => {
          setErrorMessage('');
        }, 5000);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error('Error iniciando Speech Recognition:', e);
      setErrorMessage('No se pudo iniciar el dictado.');
      setIsListening(false);
    }
  };

  // Llamar al backend para refinar el texto con Gemini
  const handleRefineText = async () => {
    if (disabled || isListening || isRefining || !value || value.trim() === '') return;

    setIsRefining(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/ai/refine-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: value,
          context: context,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al refinar el texto.');
      }

      if (data.refinedText) {
        onChange(data.refinedText);
      }
    } catch (error) {
      console.error('Error al refinar texto con IA:', error);
      setErrorMessage(error.message || 'Error al conectar con la IA.');
    } finally {
      setIsRefining(false);
    }
  };

  if (disabled) return null;

  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
      <div className="flex items-center gap-1.5">
        
        {/* Indicador de error efímero */}
        {errorMessage && (
          <span className="text-[10px] font-bold text-red-500 flex items-center gap-1 bg-red-50 px-2 py-1 rounded-lg border border-red-150 animate-fade-in">
            <AlertCircle className="h-3 w-3 shrink-0" />
            {errorMessage}
          </span>
        )}

        {/* Botón de Limpiar Texto */}
        {value && value.trim() !== '' && (
          <button
            type="button"
            onClick={() => onChange('')}
            title="Limpiar texto"
            className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-150 transition-all duration-300 flex items-center justify-center cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Botón de Dictado por Voz */}
        {hasSpeechSupport && (
          <button
            type="button"
            onClick={toggleListening}
            title={isListening ? "Detener dictado" : "Dictar observaciones por voz"}
            className={`p-1.5 rounded-lg border transition-all duration-300 flex items-center justify-center cursor-pointer ${
              isListening
                ? 'bg-red-50 text-red-500 border-red-200 animate-pulse'
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Mic className={`h-3.5 w-3.5 ${isListening ? 'scale-110' : ''}`} />
          </button>
        )}

        {/* Botón de IA */}
        <button
          type="button"
          onClick={handleRefineText}
          disabled={!value || value.trim() === '' || isRefining || isListening}
          title="Refinar y formalizar redacción con IA (Gemini)"
          className={`p-1.5 rounded-lg border transition-all duration-300 flex items-center justify-center cursor-pointer ${
            isRefining
              ? 'bg-blue-50 border-blue-200 text-[#468DFF]'
              : !value || value.trim() === ''
                ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                : 'bg-blue-50/50 border-[#468DFF]/15 text-[#468DFF] hover:bg-[#468DFF] hover:text-white hover:border-[#468DFF]'
          }`}
        >
          {isRefining ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
