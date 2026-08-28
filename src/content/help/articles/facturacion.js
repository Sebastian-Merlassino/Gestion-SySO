// src/content/help/articles/facturacion.js
import React from 'react';
import { 
  HelpPurpose, 
  HelpStep, 
  HelpTip, 
  HelpWarning, 
  HelpFaq, 
  HelpSection 
} from '@/components/help/HelpComponents';
import { Receipt, CheckCircle2, ShieldCheck, FileSpreadsheet, RefreshCw, Download, Settings, Send, Key, Sparkles, Building, MapPin, Calendar, Hash } from 'lucide-react';

export const facturacionHelp = {
  key: 'facturacion',
  title: 'Facturación Electrónica ARCA (ex AFIP)',
  subtitle: 'Guía paso a paso para conectar con ARCA, generar el CSR, completar datos fiscales y emitir facturas',
  icon: Receipt,
  tags: ['facturacion', 'arca', 'afip', 'cae', 'csr', 'pkcs10', 'certificado', 'datos-fiscales', 'punto-de-venta', 'factura-a', 'factura-b', 'factura-c', 'excel', 'masiva', 'wsfe'],
  render: () => (
    <div className="space-y-5">
      <HelpPurpose>
        El módulo de **Facturación Electrónica ARCA** te permite emitir comprobantes fiscales oficiales (Factura A, B, C y Notas de Crédito) con CAE en tiempo real, facturar a múltiples clientes a la vez importando planillas de Excel, generar PDFs con Código QR reglamentario y protegerte contra pérdidas de datos o doble facturación ante fallas de red.
      </HelpPurpose>

      {/* SECCIÓN: GUÍA DE CAMPOS FISCALES Y DÓNDE ENCONTRARLOS EN ARCA */}
      <HelpSection title="1. ¿De dónde obtener cada dato fiscal en el portal de ARCA / AFIP?" id="guia-datos-fiscales">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 space-y-3">
          <p className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
            <Building className="h-4 w-4 text-[#468DFF]" />
            Guía de Correspondencia con las pantallas de ARCA:
          </p>

          <div className="space-y-2.5">
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <strong className="text-slate-900 block text-xs">1. CUIT del Titular / Emisor</strong>
              <p className="text-[11px] text-slate-600 mt-0.5">
                <strong>En ARCA:</strong> Figura arriba a la derecha en el portal de AFIP o en tu constancia de inscripción.
                <br /><span className="text-[#468DFF] font-semibold">Formato:</span> 11 dígitos numéricos sin guiones ni espacios (ej: <code>20123456789</code>).
              </p>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <strong className="text-slate-900 block text-xs">2. Razón Social o Nombre Legal Fiscal</strong>
              <p className="text-[11px] text-slate-600 mt-0.5">
                <strong>En ARCA:</strong> En el servicio <em>"Comprobantes en Línea (RCEL)"</em> donde dice <em>"Representando a:"</em> o en tu Constancia de CUIT.
                <br /><span className="text-amber-700 font-semibold">Para Monotributistas / Personas Físicas:</span> Es tu <strong>Nombre y Apellido legal completo</strong> registrado en AFIP (ej: <code>PEREZ JUAN CARLOS</code>).
                <br /><span className="text-blue-700 font-semibold">Para Sociedades:</span> La razón social societaria registrada (ej: <code>CONSULTORA DE SEGURIDAD E HIGIENE S.R.L.</code>).
              </p>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <strong className="text-slate-900 block text-xs">3. Nombre Comercial / De Fantasía (Opcional)</strong>
              <p className="text-[11px] text-slate-600 mt-0.5">
                <strong>En ARCA:</strong> En <em>"Administración de Puntos de Venta"</em> columna <em>"Nombre de Fantasía"</em> o el nombre de tu consultora (ej: <code>Mi Consultora SySO</code>). Se imprime en el encabezado del PDF junto a tu logo.
              </p>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <strong className="text-slate-900 block text-xs">4. Condición frente al IVA</strong>
              <p className="text-[11px] text-slate-600 mt-0.5">
                <strong>En ARCA:</strong> En <em>"Sistema Registral"</em> o en tu constancia. Seleccioná <strong>Responsable Monotributo (Factura C)</strong> o <strong>IVA Responsable Inscripto (Factura A y B)</strong>.
              </p>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <strong className="text-slate-900 block text-xs">5. Punto de Venta Web Services *</strong>
              <p className="text-[11px] text-slate-600 mt-0.5">
                <strong>En ARCA:</strong> Entrá a <em>"Administración de Puntos de Venta y Domicilios"</em> &gt; <em>"A.B.M. de Puntos de Venta"</em>.
                <br />Buscá la fila cuya columna <strong>Sistema</strong> diga exactamente <strong>"Factura Electrónica - Monotributo - Web Services"</strong> (o <em>"Facturación Electrónica - Web Services"</em>).
                <br /><span className="text-emerald-700 font-semibold">Número a colocar:</span> El número de esa fila asignada a Web Services (ej: <code>1</code>, <code>2</code>, <code>5</code>, etc.).
              </p>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <strong className="text-slate-900 block text-xs">6. Domicilio Comercial / Fiscal</strong>
              <p className="text-[11px] text-slate-600 mt-0.5">
                <strong>En ARCA:</strong> En la columna <em>"Domicilio"</em> de tu listado de puntos de venta (ej: <code>Av. Corrientes 1234, CABA</code>).
                <br /><span className="text-slate-700 font-semibold">Nota:</span> En ARCA, cada punto de venta está radicado en un domicilio. Para profesionales y monotributistas, el domicilio comercial y el legal suelen coincidir en la misma dirección fiscal declarada.
              </p>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <strong className="text-slate-900 block text-xs">7. Inicio de Actividades</strong>
              <p className="text-[11px] text-slate-600 mt-0.5">
                <strong>En ARCA:</strong> En <em>"Comprobantes en Línea (RCEL)"</em> &gt; <em>"Datos adicionales del comprobante"</em> en el campo <em>"Fecha Inicio de Actividades"</em> (ej: <code>01/01/2020</code>) o en tu Constancia de Inscripción.
              </p>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <strong className="text-slate-900 block text-xs">8. Ingresos Brutos</strong>
              <p className="text-[11px] text-slate-600 mt-0.5">
                <strong>En ARCA:</strong> En <em>"Comprobantes en Línea (RCEL)"</em> &gt; <em>"Datos adicionales del comprobante"</em> o en tu constancia de inscripción provincial (AGIP / ARBA / Convenio Multilateral).
                <br /><span className="text-slate-700 font-semibold">¿Qué colocar?</span>
                <br />• Si estás en <strong>Régimen Simplificado o Exento:</strong> Colocá <code>0</code> o <code>Exento</code>.
                <br />• Si tenés <strong>Inscripción Local o Convenio Multilateral:</strong> Ingresá tu número de CUIT o número de padrón (ej: <code>901-123456-7</code>).
              </p>
            </div>
          </div>
        </div>
      </HelpSection>

      {/* SECCIÓN 2: OBTENER CERTIFICADO Y CONECTAR CON ARCA */}
      <HelpSection title="2. ¿Cómo obtener el Certificado de ARCA y Conectar el Sistema?" id="csr-y-conexion">
        <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3.5 text-xs text-slate-700 space-y-2 mb-3">
          <p className="font-bold text-blue-900 flex items-center gap-1.5">
            <Key className="h-4 w-4 text-[#468DFF]" />
            ¿Qué es un CSR (Certificate Signing Request)?
          </p>
          <p className="leading-relaxed">
            Un <strong>CSR</strong> es un archivo digital de <em>Solicitud de Firma de Certificado</em> en formato estándar <strong>PKCS#10</strong>. Contiene tu clave pública e información fiscal (tu CUIT y Razón Social). Es el archivo técnico que <strong>ARCA / AFIP te exige subir</strong> en su portal de Clave Fiscal para emitirte tu <strong>Certificado Digital (.crt) oficial</strong>.
          </p>
        </div>

        {/* Probar Conexión */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 mb-4 text-xs">
          <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
            🔌 Probar la Comunicación con ARCA sin emitir comprobantes:
          </p>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Una vez subidos tus certificados, podés presionar el botón <strong>"🔌 Probar Conexión"</strong> en la pestaña de Configuración. Esto valida la comunicación segura con los servidores de ARCA y consulta el último comprobante emitido <strong>sin generar ningún cargo ni emitir facturas</strong>.
          </p>
        </div>

        <HelpStep
          number={1}
          title="Generar el archivo CSR (.csr) y la Clave Privada (.key) en Gestión SySO"
        >
          ¡No necesitás usar comandos complicados ni programas externos!
          <ul className="list-disc pl-4 space-y-1 mt-1 text-slate-600">
            <li>Completá tus datos fiscales en el paso 1 (CUIT y Razón Social).</li>
            <li>En la tarjeta del Paso 2, presioná el botón <strong>"Generar CSR y Clave Privada"</strong>.</li>
            <li>Se descargarán automáticamente 2 archivos a tu computadora:
              <ul className="list-circle pl-4 mt-1 space-y-0.5 text-[11px]">
                <li><code>pedido_TU_CUIT.csr</code>: La solicitud en formato PKCS#10 que vas a subir a ARCA.</li>
                <li><code>privada_TU_CUIT.key</code>: Tu clave privada de 2048 bits (guardala para el paso 4).</li>
              </ul>
            </li>
          </ul>
        </HelpStep>

        <HelpStep
          number={2}
          title="Subir el CSR en el Portal de ARCA / AFIP y Obtener tu Certificado (.crt)"
        >
          <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg text-xs space-y-1 mt-1">
            <strong className="text-emerald-900 block font-bold">Pasos en el portal de ARCA:</strong>
            <ul className="list-disc pl-4 space-y-1 text-slate-700 text-[11px]">
              <li>Ingresá con CUIT y Clave Fiscal en <a href="https://auth.afip.gob.ar" target="_blank" rel="noreferrer" className="text-[#468DFF] underline font-semibold">afip.gob.ar</a> al servicio <strong>"Administración de Certificados Digitales"</strong>.</li>
              <li>Hacé clic en <strong>"Agregar alias"</strong>, escribí en Alias <code>Gestión SySO</code> y subí el archivo <code>.csr</code> descargado.</li>
              <li>Presioná "Agregar alias" y descargá el archivo <strong><code>.crt</code></strong> oficial otorgado por ARCA.</li>
            </ul>
          </div>
        </HelpStep>

        <HelpStep
          number={3}
          title="Delegar el Servicio de Facturación Electrónica (WSFE)"
        >
          Autorizá a tu alias a emitir comprobantes a través de Web Services:
          <ul className="list-disc pl-4 space-y-1 mt-1 text-slate-600">
            <li>En el portal de ARCA, entrá a <strong>"Administrador de Relaciones de Clave Fiscal"</strong>.</li>
            <li>Hacé clic en <strong>"Nueva Relación"</strong> &gt; <strong>"Buscar Servicio"</strong> &gt; <strong>"ARCA / AFIP"</strong> &gt; <strong>"Web Services"</strong>.</li>
            <li>Seleccioná <strong>"Facturación Electrónica" (WSFE)</strong>.</li>
            <li>En <em>"Representante / Computador"</em> seleccioná el alias <strong>"Gestión SySO"</strong> creado en el paso 2 y confirmá.</li>
          </ul>
        </HelpStep>

        <HelpStep
          number={4}
          title="Cargar los Certificados y Probar Conexión en Gestión SySO"
        >
          Volvé a Gestión SySO en la sección <strong>"Configurar"</strong>:
          <ul className="list-disc pl-4 space-y-1 mt-1 text-slate-600">
            <li>En la sección <em>3. Certificados Digitales de ARCA</em>, cargá el archivo <code>.crt</code> (entregado por ARCA) y el archivo <code>.key</code> (tu clave privada) y presioná <strong>"Actualizar Certificados"</strong>.</li>
            <li>Presioná <strong>"🔌 Probar Conexión"</strong>. El sistema confirmará la comunicación exitosa en vivo con ARCA.</li>
          </ul>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[11px] text-amber-900 mt-2.5 space-y-1.5">
            <p className="font-bold flex items-center gap-1 text-xs">
              ⏱️ Nota sobre los tiempos de activación de ARCA:
            </p>
            <p>
              Cuando acabás de confirmar la delegación en ARCA, los servidores de autenticación (WSAA) pueden tardar <strong>entre 2 y 5 minutos</strong> en sincronizar la autorización. Si probás la conexión de inmediato y recibís un error <code>401 (No autorizado)</code>, simplemente aguardá unos minutos y volvé a presionar <em>"Probar Conexión"</em>.
            </p>
          </div>
        </HelpStep>
      </HelpSection>

      {/* SECCIÓN 3: FACTURACIÓN INDIVIDUAL Y NOTAS DE CRÉDITO */}
      <HelpSection title="3. Emisión de Facturas y Notas de Crédito (Anulaciones)" id="facturacion-individual">
        <HelpStep
          number={5}
          title="Iniciar Nuevo Comprobante"
        >
          Hacé clic en el botón azul <strong>"+ Emitir Factura"</strong> en la barra superior.
        </HelpStep>

        <HelpStep
          number={6}
          title="Seleccionar Tipo de Comprobante (Factura o Nota de Crédito)"
        >
          En el campo <strong>"Tipo de Comprobante"</strong> podés elegir:
          <ul className="list-disc pl-4 space-y-1 mt-1 text-slate-600">
            <li><strong>Facturas:</strong> Factura C (Monotributo), Factura A o Factura B (Responsable Inscripto).</li>
            <li><strong>Notas de Crédito (para anular o bonificar):</strong> <code>Nota de Crédito C</code>, <code>Nota de Crédito A</code> o <code>Nota de Crédito B</code>.</li>
            <li><strong>Notas de Débito:</strong> <code>Nota de Débito C</code>, <code>A</code> o <code>B</code> para recargos o ajustes.</li>
          </ul>
        </HelpStep>

        <HelpStep
          number={7}
          title="Seleccionar Cliente, Concepto e Ítems"
        >
          <ul className="list-disc pl-4 space-y-1 mt-1 text-slate-600">
            <li><strong>Concepto:</strong> Seleccioná <em>Servicios</em> (habitual para consultoras de SySO) o <em>Productos</em>. Si es Servicios, indicá el período facturado.</li>
            <li><strong>Cliente:</strong> Elegí una empresa de tu listado para autocompletar CUIT y Razón Social, o ingresá los datos manualmente.</li>
            <li><strong>Ítems y Precios:</strong> Detallá los servicios prestados o el motivo de anulación/crédito, cantidad y precio unitario.</li>
          </ul>
        </HelpStep>

        <HelpStep
          number={8}
          title="Emitir con CAE oficial o Guardar Borrador"
        >
          <ul className="list-disc pl-4 space-y-1 mt-1 text-slate-600">
            <li><strong>Emitir a ARCA:</strong> Se conecta de forma segura con los Web Services de ARCA, valida correlatividades y devuelve el <strong>CAE oficial</strong> en el momento.</li>
            <li><strong>Guardar Borrador:</strong> Guarda el comprobante de manera local para revisarlo antes de enviarlo formalmente a AFIP.</li>
          </ul>
        </HelpStep>
      </HelpSection>

      {/* SECCIÓN 4: ALMACENAMIENTO, DESCARGA Y FORMATO DE ARCHIVOS PDF */}
      <HelpSection title="4. Almacenamiento, PDFs Oficiales y Nombres de Archivo" id="almacenamiento-pdf">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 space-y-3">
          <div>
            <strong className="text-slate-900 block text-xs">¿Dónde se guardan las facturas? ¿Es un enlace a AFIP?</strong>
            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
              Las facturas <strong>quedan guardadas permanentemente en la base de datos de tu cuenta en Gestión SySO</strong>. No dependen de un enlace externo a AFIP (ya que AFIP no aloja PDFs públicos). La plataforma genera el <strong>PDF oficial reglamentario con Código QR interactivo de ARCA</strong> y podés descargarlo, reimprimirlo o consultarlo las 24 horas del día.
            </p>
          </div>

          <div className="border-t border-slate-200 pt-2.5">
            <strong className="text-slate-900 block text-xs">Nomenclatura automática de archivos descargados:</strong>
            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
              Cada comprobante se descarga automáticamente nombrado con su tipo, letra, punto de venta y número oficial para facilitar su archivo contable:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 font-mono text-[11px]">
              <div className="p-2 bg-white rounded border border-slate-200 text-emerald-800">
                📄 Factura_C_00005-00000012.pdf
              </div>
              <div className="p-2 bg-white rounded border border-slate-200 text-blue-800">
                📄 Factura_A_00005-00000008.pdf
              </div>
              <div className="p-2 bg-white rounded border border-slate-200 text-purple-800">
                📄 Nota_Credito_C_00005-00000001.pdf
              </div>
              <div className="p-2 bg-white rounded border border-slate-200 text-slate-800">
                📄 Factura_B_00005-00000003.pdf
              </div>
            </div>
          </div>
        </div>
      </HelpSection>

      {/* SECCIÓN 5: FACTURACIÓN MASIVA EXCEL */}
      <HelpSection title="5. Facturación Masiva desde Planilla Excel" id="facturacion-masiva">
        <HelpStep
          number={9}
          title="Descargar la Plantilla Modelo Excel"
        >
          Hacé clic en <strong>"Masiva Excel"</strong> y presioná <strong>"📥 Descargar Plantilla Excel"</strong>. Esta planilla contiene las columnas ya formateadas según tu condición frente al IVA.
        </HelpStep>

        <HelpStep
          number={10}
          title="Completar los Datos Mínimos Requeridos"
        >
          Llená una fila por cada cliente a facturar:
          <ul className="list-disc pl-4 space-y-1 mt-1 text-slate-600 text-[11px]">
            <li><code>Tipo Comprobante</code>: 11 para Factura C, 1 para Factura A, 6 para Factura B.</li>
            <li><code>Doc Tipo</code>: 80 para CUIT, 96 para DNI, 99 para Consumidor Final.</li>
            <li><code>Doc Numero</code>: CUIT o DNI del cliente (ej: <code>30712345678</code>).</li>
            <li><code>Razon Social / Cliente</code>: Nombre de la empresa o cliente.</li>
            <li><code>Descripcion Item</code>: Detalle del servicio de SySO prestado.</li>
            <li><code>Precio Unitario</code>: Monto total del servicio.</li>
            <li><code>Fecha Serv Desde / Hasta</code> y <code>Fecha Vto Pago</code>: Formato <code>YYYY-MM-DD</code>.</li>
          </ul>
        </HelpStep>

        <HelpStep
          number={11}
          title="Subir y Emitir en Lote Automático"
        >
          Arrastrá el archivo Excel a la plataforma y presioná <strong>"Emitir Lote de Facturas"</strong>. El sistema procesará cada comprobante de forma secuencial en ARCA y te entregará el reporte final de CAEs obtenidos.
        </HelpStep>
      </HelpSection>

      {/* SECCIÓN 6: REGISTRO DE AUDITORÍA FISCAL */}
      <HelpSection title="6. Botón 'Auditoría': Registro de Seguridad y Trazabilidad" id="auditoria-fiscal">
        <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-4 text-xs text-slate-700 space-y-2">
          <p className="font-bold text-indigo-950 flex items-center gap-1.5 text-xs">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            ¿Para qué sirve la sección de Auditoría?
          </p>
          <p className="leading-relaxed text-[11px]">
            La <strong>Auditoría</strong> es un registro inmutable que guarda la trazabilidad completa de todo lo que ocurre en el módulo:
          </p>
          <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11px]">
            <li><strong>Diagnóstico de errores de ARCA:</strong> Si un comprobante es rechazado, podés expandir la fila y leer la respuesta técnica exacta enviada por AFIP.</li>
            <li><strong>Control de usuarios e IPs:</strong> Registra quién emitió cada factura, desde qué dirección IP y en qué fecha y hora exacta.</li>
            <li><strong>Exportación a Excel:</strong> Cuenta con un botón para descargar el registro completo en Excel para control contable o peritajes.</li>
          </ul>
        </div>
      </HelpSection>

      {/* FAQS */}
      <HelpSection title="Preguntas Frecuentes (FAQs)" id="faqs">
        <HelpFaq question="¿Cómo anulo una factura emitida por error?">
          Las facturas con CAE otorgado no se pueden borrar (por exigencia legal de AFIP). Para anularla, hacé clic en <strong>"+ Emitir Factura"</strong>, seleccioná en Tipo de Comprobante <strong>"Nota de Crédito C"</strong> (o A/B), ingresá el mismo cliente e importe a anular, y hacé clic en <em>"Emitir Factura a ARCA"</em>.
        </HelpFaq>

        <HelpFaq question="¿Por qué la prueba de conexión devuelve 'Request failed with status code 401'?">
          Ocurre principalmente por dos razones habituales:
          <br />1. <strong>Tiempo de replicación en ARCA:</strong> Cuando acabás de crear la delegación en el Administrador de Relaciones de Clave Fiscal, los servidores de autenticación (WSAA) tardan entre 2 y 5 minutos en sincronizarse. Aguardá 3 minutos y reintentá.
          <br />2. <strong>Entorno desfasado:</strong> Si el certificado se generó en AFIP normal (Producción), asegurate de haber seleccionado 'Producción (Validez Fiscal Real)' en el paso 1 y presionado 'Guardar Datos Fiscales'.
        </HelpFaq>

        <HelpFaq question="¿Por qué ARCA me dice 'El Request enviado es inválido'?">
          Ese error ocurre en ARCA si intentás subir un archivo que no es un CSR en formato PKCS#10 o si el CSR no fue firmado con una clave RSA de 2048 bits. Usando el botón <strong>'Generar CSR y Clave Privada'</strong> de Gestión SySO, el archivo generado cumple al 100% con los requisitos de ARCA y es aceptado de inmediato.
        </HelpFaq>

        <HelpFaq question="¿Mis certificados y datos fiscales están seguros?">
          Sí. Los certificados y claves privadas se almacenan en un repositorio privado encriptado con políticas de seguridad Multi-Tenant (RLS) y no son accesibles desde el navegador. Solo el backend autorizado interactúa con ARCA.
        </HelpFaq>
      </HelpSection>
    </div>
  )
};
