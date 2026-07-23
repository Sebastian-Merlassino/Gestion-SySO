// src/lib/pdf/pdfImages.js
/**
 * Helper para carga, compresión y cálculo proporcional de imágenes en jsPDF
 */

export async function getBase64ImageFromUrl(url) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error('Error al convertir imagen a Base64:', err);
    return null;
  }
}

/**
 * Calcula las dimensiones óptimas para la imagen manteniendo su aspecto original
 */
export function calculateAspectRatioFit(srcWidth, srcHeight, maxWidth, maxHeight) {
  const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
  return {
    width: srcWidth * ratio,
    height: srcHeight * ratio
  };
}
