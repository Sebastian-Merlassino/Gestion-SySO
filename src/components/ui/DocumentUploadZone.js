import React, { useState, useRef } from 'react';
import { Upload, FileText, Eye, Check, Loader2, ExternalLink, Trash2, Download } from 'lucide-react';
import { useToast } from '../providers/ToastProvider';

/**
 * Validates if the file matches the accept criteria (extensions or mime types)
 */
const validateAccept = (file, acceptString) => {
  if (!acceptString) return true;
  const acceptedTypes = acceptString.split(',').map(t => t.trim().toLowerCase());
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();

  return acceptedTypes.some(type => {
    if (type.startsWith('.')) {
      // File extension, e.g. .pdf or .xlsx
      return fileName.endsWith(type);
    } else if (type.endsWith('/*')) {
      // Mime wildcard, e.g. image/*
      const prefix = type.replace('/*', '');
      return fileType.startsWith(prefix);
    } else {
      // Exact mime type, e.g. application/pdf
      return fileType === type;
    }
  });
};

export default function DocumentUploadZone({
  label,
  file,
  fileName,
  url,
  signedUrl,
  onFileChange,
  onDriveImportSuccess,
  onViewPdf,
  onDelete,
  disabled = false,
  accept = 'application/pdf',
  maxSizeMB = 10,
  tenantId = '',
  onToast,
  uploadType: propUploadType,
  setUploadType: propSetUploadType,
  showTabs = true,
  onDriveImport,
  tabs = [
    { id: 'local', name: 'Archivo Local' },
    { id: 'drive', name: 'Enlace Drive' }
  ],
  children,
  minHeightClass = '',
  borderless = false,
}) {
  const [internalUploadType, setInternalUploadType] = useState('local');
  const uploadType = propUploadType !== undefined ? propUploadType : internalUploadType;
  const setUploadType = propSetUploadType !== undefined ? propSetUploadType : setInternalUploadType;

  const [driveLink, setDriveLink] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  let globalToast = null;
  try {
    globalToast = useToast();
  } catch (e) {
    // ignorar si no hay provider
  }
  const activeToast = onToast || globalToast?.toast;

  const fileUrl = file
    ? (typeof window !== 'undefined' ? URL.createObjectURL(file) : '')
    : (signedUrl || url || '');

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled && e.dataTransfer.files?.[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (selectedFile) => {
    if (!selectedFile) return;

    // Validate accept types
    if (accept) {
      const isAccepted = validateAccept(selectedFile, accept);
      if (!isAccepted) {
        const errorMsg = `Solo se permiten archivos con formato: ${accept}`;
        if (activeToast) {
          activeToast(errorMsg, 'error');
        } else {
          console.error(errorMsg);
        }
        return;
      }
    }

    // Validate size limit
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (selectedFile.size > maxSizeBytes) {
      const errorMsg = `El archivo no debe superar los ${maxSizeMB} MB.`;
      if (activeToast) {
        activeToast(errorMsg, 'error');
      } else {
        console.error(errorMsg);
      }
      return;
    }

    onFileChange(selectedFile);
  };

  const handleDriveImport = async () => {
    if (!driveLink) {
      onToast?.('Ingresá un enlace de Google Drive.', 'error');
      return;
    }
    setUploading(true);
    try {
      if (onDriveImport) {
        await onDriveImport(driveLink);
        setDriveLink('');
      } else {
        const res = await fetch('/api/upload-from-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: driveLink, tenantId }),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || 'Error al importar desde Drive.');
        }

        onDriveImportSuccess?.(data.filePath, 'Archivo de Drive importado');
        onToast?.('Archivo importado desde Google Drive.', 'success');
        setDriveLink('');
      }
    } catch (err) {
      onToast?.(err.message || 'Error al importar desde Drive.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const mainDropzone = (
    <div className={`overflow-hidden flex flex-col h-full w-full ${borderless ? '' : 'rounded-xl border border-slate-200 bg-slate-50'}`}>
      {/* Selector de Pestañas */}
      {showTabs && (
        <div className="flex border-b border-slate-200 bg-white text-xs font-semibold shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              disabled={disabled}
              onClick={() => setUploadType(tab.id)}
              className={`flex-1 py-2 transition-colors ${
                uploadType === tab.id
                  ? 'bg-[#468DFF] text-white'
                  : 'text-slate-500 hover:text-slate-700 disabled:opacity-50'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>
      )}

      {/* Contenido de la Pestaña */}
      <div className="p-3 flex-1 flex flex-col justify-center">
        {uploadType === 'local' && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !disabled && inputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-all flex-1 flex flex-col items-center justify-center ${minHeightClass}
              ${isDragging ? 'border-[#468DFF] bg-blue-50' : 'border-slate-200 bg-white'}
              ${disabled ? 'opacity-75 cursor-default' : 'hover:border-[#468DFF] hover:bg-blue-50/30 cursor-pointer'}`}
          >
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              className="hidden"
              disabled={disabled}
              onChange={(e) => handleFileChange(e.target.files?.[0])}
            />
             {fileName ? (
              <div className="flex items-center gap-2 justify-center text-sm text-slate-700 flex-wrap my-auto">
                <FileText className="h-4 w-4 text-[#468DFF]" />
                <span className="font-medium truncate max-w-[200px]">{fileName}</span>
              </div>
            ) : (
              <div className="my-auto flex flex-col items-center justify-center">
                <Upload className="h-6 w-6 text-slate-400 mx-auto mb-1" />
                <p className="text-xs text-slate-500">
                  {isDragging ? 'Soltá el archivo aquí' : `Arrastrá o hacé clic para seleccionar un ${accept.includes('pdf') ? 'PDF' : 'archivo'}`}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Máx. {maxSizeMB} MB</p>
              </div>
            )}
          </div>
        )}

        {uploadType === 'drive' && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="url"
                value={driveLink}
                onChange={(e) => setDriveLink(e.target.value)}
                disabled={disabled || uploading}
                placeholder="https://drive.google.com/..."
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#468DFF] disabled:opacity-60"
              />
              <button
                type="button"
                onClick={handleDriveImport}
                disabled={disabled || uploading || !driveLink}
                className="px-3 py-2 bg-[#468DFF] text-white rounded-lg text-xs font-semibold hover:bg-[#0511F2] transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {uploading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ExternalLink className="h-3 w-3" />
                )}
                Importar
              </button>
            </div>
            {fileName && (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Check className="h-3.5 w-3.5 text-green-500" />
                <span>{fileName}</span>
              </div>
            )}
          </div>
        )}

        {uploadType !== 'local' && uploadType !== 'drive' && children}
      </div>
    </div>
  );

  if (label) {
    return (
      <div className="flex flex-col h-full w-full space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-600">{label}</label>
          {(fileName || fileUrl) && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onViewPdf ? onViewPdf(fileUrl) : (typeof window !== 'undefined' && window.open(fileUrl, '_blank'))}
                title={`Ver ${label}`}
                className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:text-[#468DFF] hover:bg-blue-50 hover:border-blue-150 transition-all duration-300 flex items-center justify-center cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
              {fileUrl && (
                <button
                  type="button"
                  onClick={() => {
                    if (!fileUrl.startsWith('http://') && !fileUrl.startsWith('https://') && !fileUrl.startsWith('blob:')) {
                      // Es una ruta relativa de storage → firmar en caliente mediante onViewPdf
                      if (onViewPdf) {
                        onViewPdf(fileUrl);
                      }
                    } else {
                      // Ya es una URL completa/firmada → abrir directamente para descarga
                      if (typeof window !== 'undefined') {
                        window.open(fileUrl, '_blank');
                      }
                    }
                  }}
                  title={`Descargar ${label}`}
                  className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:text-[#468DFF] hover:bg-blue-50 hover:border-blue-150 transition-all duration-300 flex items-center justify-center cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              )}
              {!disabled && onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  title={`Eliminar ${label}`}
                  className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all duration-300 flex items-center justify-center cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
        {mainDropzone}
      </div>
    );
  }

  return mainDropzone;
}
