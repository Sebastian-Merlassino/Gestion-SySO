// src/lib/pdf/pdfPrintHelper.js

/**
 * Imprime un documento PDF abriendo una ventana/pestaña de vista previa
 * e invocando el cuadro de diálogo de impresión nativo del navegador.
 *
 * @param {Object|Blob|string} docOrBlob - Instancia de jsPDF, Blob o Blob URL string.
 * @param {Window|null} existingWindow - Ventana pre-abierta con window.open('', '_blank') para evitar bloqueo de popups.
 * @param {string} title - Título que se mostrará en la pestaña del navegador.
 */
export function printPdfDocument(docOrBlob, existingWindow = null, title = 'Imprimir Documento') {
  let blobUrl = '';
  
  if (typeof docOrBlob === 'string') {
    blobUrl = docOrBlob;
  } else if (docOrBlob && typeof docOrBlob.output === 'function') {
    const blob = docOrBlob.output('blob');
    blobUrl = URL.createObjectURL(blob);
  } else if (docOrBlob instanceof Blob) {
    blobUrl = URL.createObjectURL(docOrBlob);
  }

  if (!blobUrl) {
    console.error('printPdfDocument: No se pudo obtener la URL del Blob PDF.');
    if (existingWindow && !existingWindow.closed) {
      existingWindow.close();
    }
    return;
  }

  const printWin = existingWindow || window.open('', '_blank');
  if (!printWin) {
    if (typeof alert !== 'undefined') {
      alert('Por favor permita las ventanas emergentes en su navegador para imprimir el documento.');
    }
    return;
  }

  const safeTitle = (title || 'Documento PDF').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  printWin.document.write(`
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${safeTitle}</title>
        <style>
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background-color: #0f172a;
            font-family: system-ui, -apple-system, sans-serif;
          }
          iframe {
            width: 100%;
            height: 100%;
            border: none;
          }
        </style>
      </head>
      <body>
        <iframe id="pdfPrintFrame" src="${blobUrl}"></iframe>
        <script>
          const frame = document.getElementById('pdfPrintFrame');
          frame.onload = function() {
            setTimeout(function() {
              try {
                frame.contentWindow.focus();
                frame.contentWindow.print();
              } catch (e) {
                console.error('Error al ejecutar print():', e);
              }
            }, 450);
          };
        </script>
      </body>
    </html>
  `);
  printWin.document.close();
}
