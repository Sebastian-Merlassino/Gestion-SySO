import React, { useState, useRef } from 'react';
import { Camera, Upload, Trash2, Image as ImageIcon, Loader2, Eye } from 'lucide-react';

/**
 * Validates file size and format for images
 */
const validateImage = (file, maxSizeMB, onToast) => {
  if (!file) return false;
  
  // Format validation
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
  if (!validTypes.includes(file.type)) {
    const errorMsg = 'Solo se permiten imágenes en formato JPG, PNG, GIF o WEBP.';
    if (onToast) {
      onToast(errorMsg, 'error');
    } else {
      alert(errorMsg);
    }
    return false;
  }

  // Size validation
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    const errorMsg = `La imagen no debe superar los ${maxSizeMB} MB.`;
    if (onToast) {
      onToast(errorMsg, 'error');
    } else {
      alert(errorMsg);
    }
    return false;
  }

  return true;
};

export default function ImageUploadZone({
  label,
  preview,            // Single image preview URL
  onFileChange,       // Single file handler: (file) => void
  onClear,            // Single clear handler: () => void
  disabled = false,
  maxSizeMB = 5,
  onToast,
  multiple = false,   // Multiple images mode
  images = [],        // Multiple images list: array of { preview, file } or strings
  onAddPhotos,        // Multiple images add handler: (filesArray) => void
  onRemovePhoto,      // Multiple images remove handler: (index) => void
}) {
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);

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
    if (disabled) return;

    if (multiple) {
      const droppedFiles = Array.from(e.dataTransfer.files || []);
      const validFiles = droppedFiles.filter(file => validateImage(file, maxSizeMB, onToast));
      if (validFiles.length > 0 && onAddPhotos) {
        onAddPhotos(validFiles);
      }
    } else {
      const file = e.dataTransfer.files?.[0];
      if (file && validateImage(file, maxSizeMB, onToast) && onFileChange) {
        onFileChange(file);
      }
    }
  };

  const handleFileChangeInternal = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    if (multiple) {
      const validFiles = selectedFiles.filter(file => validateImage(file, maxSizeMB, onToast));
      if (validFiles.length > 0 && onAddPhotos) {
        onAddPhotos(validFiles);
      }
    } else {
      const file = selectedFiles[0];
      if (file && validateImage(file, maxSizeMB, onToast) && onFileChange) {
        onFileChange(file);
      }
    }

    // Reset input value to allow selecting same file again
    e.target.value = '';
  };

  return (
    <div className="space-y-3">
      {/* Label above */}
      {label && (
        <label className="text-xs font-bold text-slate-600 block mb-1.5">{label}</label>
      )}

      {/* Upload Zone */}
      {!multiple && preview ? (
        <div className="relative w-full h-48 bg-white border border-slate-200 rounded-xl overflow-hidden group shadow-sm flex items-center justify-center">
          <img src={preview} alt={label || "Vista previa"} className="w-full h-full object-cover" />
          {!disabled && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="p-2 bg-white hover:bg-slate-100 text-slate-800 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5 text-[#468DFF]" />
                Cambiar
              </button>
              <button
                type="button"
                onClick={onClear}
                className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Quitar
              </button>
            </div>
          )}
          {/* Fallback inputs for changing file */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={disabled}
            onChange={handleFileChangeInternal}
          />
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all ${multiple ? 'py-8' : 'h-48'} flex flex-col items-center justify-center gap-3
            ${isDragging ? 'border-[#468DFF] bg-blue-50/50' : 'border-slate-200 bg-white hover:border-[#468DFF] hover:bg-blue-50/30'}
            ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple={multiple}
            className="hidden"
            disabled={disabled}
            onChange={handleFileChangeInternal}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={disabled}
            onChange={handleFileChangeInternal}
          />
          
          <div className="flex flex-col items-center gap-1">
            <ImageIcon className="h-8 w-8 text-slate-400" />
            <p className="text-xs font-semibold text-slate-600">
              {multiple ? 'Arrastrá tus imágenes aquí o' : 'Arrastrá tu imagen aquí o'}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
              className="px-3 py-1.5 bg-[#468DFF]/15 text-[#468DFF] hover:bg-[#468DFF]/25 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm"
            >
              <Upload className="h-3.5 w-3.5" />
              Seleccionar archivo
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={(e) => { e.stopPropagation(); cameraRef.current?.click(); }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm"
            >
              <Camera className="h-3.5 w-3.5 text-[#468DFF]" />
              Sacar foto
            </button>
          </div>
          
          <p className="text-[9px] text-slate-400 font-medium">PNG, JPG, JPEG o WEBP de hasta {maxSizeMB} MB por archivo</p>
        </div>
      )}

      {/* Grid of previews for multiple mode */}
      {multiple && images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
          {images.map((img, idx) => (
            <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group shadow-sm flex items-center justify-center">
              <img src={img.preview || img} alt="Vista previa" className="w-full h-full object-cover" />
              {/* Hover overlay with action buttons */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                <a
                  href={img.preview || img}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Ver en pantalla completa"
                  className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                >
                  <Eye className="h-4 w-4" />
                </a>
                {!disabled && onRemovePhoto && (
                  <button
                    type="button"
                    onClick={() => onRemovePhoto(idx)}
                    title="Eliminar"
                    className="p-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
