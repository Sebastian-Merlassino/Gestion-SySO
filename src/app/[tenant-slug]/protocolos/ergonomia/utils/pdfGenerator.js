import jsPDF from 'jspdf';
import { formatDate } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { setFillColor, setDrawColor, setTextColor, hexToRgb, PDF_THEME } from '@/lib/pdf/pdfTheme';
import { getBase64ImageFromUrl } from '@/lib/pdf/pdfImages';
import { FANGER_CHART_BASE64 } from './fangerChartBase64';

// Helper Base64 getter for signature/logo images
const getAdjuntoBase64 = async (adj) => {
  if (!adj) return '';
  if (adj.preview && adj.preview.startsWith('data:image/')) return adj.preview;
  if (adj.public_url && adj.public_url.startsWith('data:image/')) return adj.public_url;

  const path = adj.storage_path || adj.original_path || adj.public_url || adj.url || adj.archivo_url;
  if (!path) return '';

  if (!path.startsWith('http') && !path.startsWith('data:')) {
    try {
      const { data: blob, error } = await supabase.storage
        .from('protocolos-ergonomia')
        .download(path);

      if (!error && blob) {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result || '');
          reader.onerror = () => resolve('');
          reader.readAsDataURL(blob);
        });
      }
    } catch (err) {
      console.warn('[getAdjuntoBase64] Supabase storage download warning:', err);
    }
  }

  let targetUrl = path;
  if (!targetUrl.startsWith('http') && !targetUrl.startsWith('data:')) {
    try {
      const { data: sData } = await supabase.storage
        .from('protocolos-ergonomia')
        .createSignedUrl(path, 3600);
      if (sData?.signedUrl) targetUrl = sData.signedUrl;
    } catch (e) {
      const { data: pData } = supabase.storage
        .from('protocolos-ergonomia')
        .getPublicUrl(path);
      if (pData?.publicUrl) targetUrl = pData.publicUrl;
    }
  }

  return await getBase64ImageFromUrl(targetUrl);
};

// Dimensions getter for Base64 image
const getImgDimensions = (base64Str) => {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith('data:image/')) {
      resolve({ width: 120, height: 50 });
      return;
    }
    const img = new Image();
    img.src = base64Str;
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => resolve({ width: 120, height: 50 });
  });
};

// Helper to fetch signature Base64 defensively from URL or Supabase storage path
const fetchSignatureImage = async (urlOrPath) => {
  if (!urlOrPath || urlOrPath === 'N/A') return '';
  if (typeof urlOrPath === 'string' && urlOrPath.startsWith('data:image/')) return urlOrPath;

  let targetUrl = urlOrPath;
  let relativePath = urlOrPath;
  let bucketName = 'signatures';

  // 1. Si es una URL completa HTTP/HTTPS (p. ej. Supabase Storage URL)
  if (typeof urlOrPath === 'string' && (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://'))) {
    try {
      const b64Direct = await getBase64ImageFromUrl(urlOrPath);
      if (b64Direct && b64Direct.startsWith('data:image/')) {
        return b64Direct;
      }
    } catch (e) {}

    try {
      const urlObj = new URL(urlOrPath);
      const pathParts = urlObj.pathname.split('/');
      const bIdx = pathParts.findIndex(p => p === 'signatures' || p === 'documents' || p === 'avatars' || p === 'protocolos-ergonomia' || p === 'public');
      if (bIdx !== -1 && bIdx < pathParts.length - 1) {
        bucketName = pathParts[bIdx];
        relativePath = pathParts.slice(bIdx + 1).join('/');
      }
    } catch (urlErr) {
      console.warn('Error parsing URL in fetchSignatureImage:', urlErr);
    }
  }

  // 2. Limpiar prefijos de bucket en relativePath (ej. 'signatures/tenant/user/file.png')
  if (typeof relativePath === 'string') {
    const knownBuckets = ['signatures', 'protocolos-ergonomia', 'documents', 'avatars', 'public'];
    for (const b of knownBuckets) {
      if (relativePath.startsWith(`${b}/`)) {
        bucketName = b;
        relativePath = relativePath.slice(b.length + 1);
        break;
      }
    }
  }

  // 3. Intentar recuperar desde Supabase Storage generando URL firmada o descarga directa
  if (typeof relativePath === 'string' && relativePath && !relativePath.startsWith('http') && !relativePath.startsWith('data:')) {
    const candidateBuckets = Array.from(new Set([bucketName, 'signatures', 'protocolos-ergonomia', 'documents', 'avatars', 'public']));

    for (const b of candidateBuckets) {
      // Intento A: URL Firmada con sesión del usuario
      try {
        const { data: sData, error: sErr } = await supabase.storage
          .from(b)
          .createSignedUrl(relativePath, 3600);

        if (!sErr && sData?.signedUrl) {
          const b64 = await getBase64ImageFromUrl(sData.signedUrl);
          if (b64 && b64.startsWith('data:image/')) {
            return b64;
          }
        }
      } catch (err) {}

      // Intento B: Descarga directa de Blob
      try {
        const { data: blob, error: dErr } = await supabase.storage
          .from(b)
          .download(relativePath);

        if (!dErr && blob) {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result || '');
            reader.onerror = () => resolve('');
            reader.readAsDataURL(blob);
          });
        }
      } catch (err) {}

      // Intento C: URL pública
      try {
        const { data: pData } = supabase.storage.from(b).getPublicUrl(relativePath);
        if (pData?.publicUrl) {
          const b64 = await getBase64ImageFromUrl(pData.publicUrl);
          if (b64 && b64.startsWith('data:image/')) {
            return b64;
          }
        }
      } catch (err) {}
    }
  }

  // 4. Reintento final si targetUrl es HTTP
  if (typeof targetUrl === 'string' && targetUrl.startsWith('http')) {
    try {
      const b64 = await getBase64ImageFromUrl(targetUrl);
      if (b64 && b64.startsWith('data:image/')) return b64;
    } catch (e) {}
  }

  return '';
};

// Cuestionarios Oficiales Res. SRT 886/15
const CUESTIONARIOS_PLANILLA2 = {
  levantamiento: {
    code: '2.A',
    title: '2.A: LEVANTAMIENTO Y/O DESCENSO MANUAL DE CARGA SIN TRANSPORTE',
    paso1: [
      { id: 'p1_1', text: 'Levantar y/o bajar manualmente cargas de peso superior a 2 kg. y hasta 25 kg.' },
      { id: 'p1_2', text: 'Realizar diariamente y en forma cíclica operaciones de levantamiento / descenso con una frecuencia > 1 por hora o < 360 (si se realiza en forma esporádica consignar NO)' },
      { id: 'p1_3', text: 'Levantar y/o bajar manualmente cargas de peso superior a 25 kg.' }
    ],
    paso2: [
      { id: 'p2_1', text: 'El trabajador levanta, sostiene y deposita la carga sobrepasando con sus manos 30 cm sobre la altura del hombro' },
      { id: 'p2_2', text: 'El trabajador levanta, sostiene y deposita la carga sobrepasando con sus manos una distancia horizontal mayor a 80 cm desde el punto medio entre los tobillos sobre la altura del hombro' },
      { id: 'p2_3', text: 'Entre la toma y el depósito de la carga, el trabajador gira o inclina la cintura más de 30° a uno u otro (o a ambos) considerados desde el plano sagital' },
      { id: 'p2_4', text: 'Las cargas poseen formas irregulares, son difíciles de asir, se deforman o hay movimiento en su interior' },
      { id: 'p2_5', text: 'El trabajador levanta, sostiene y deposita la carga con un solo brazo' },
      { id: 'p2_6', text: 'El trabajador presenta alguna manifestación temprana de las enfermedades mencionadas en el ART 1 de la presente Resolución' }
    ]
  },
  empuje_arrastre: {
    code: '2.B',
    title: '2.B: EMPUJE Y ARRASTRE MANUAL DE CARGAS',
    paso1: [
      { id: 'p1_1', text: 'Se realizan diariamente tareas cíclicas con una frecuencia >= 1 movimientos por jornada (si son esporádicas consignar NO)' },
      { id: 'p1_2', text: 'El trabajador se desplaza empujando y/o arrastrando manualmente un objeto recorriendo una distancia mayor a 60 mts.' },
      { id: 'p1_3', text: 'En el puesto de trabajo se empujan o arrastran cíclicamente objetos (bolsones, cajas, muebles, maquinas etc.) cuyo esfuerzo medido con dinamómetro superior a 34 kgf' }
    ],
    paso2: [
      { id: 'p2_1', text: 'Para empujar el objeto rodante se requiere un esfuerzo inicial medido con dinamómetro >= 12 kgf para hombres o 10 kgf para mujeres' },
      { id: 'p2_2', text: 'Para arrastrar el objeto rodante se requiere un esfuerzo inicial medido con dinamómetro >= 10 kgf para hombres o mujeres' },
      { id: 'p2_3', text: 'El objeto rodante es empujado y/o arrastrado con dificultad (la superficie de deslizamiento es despareja, hay rampas que subir o bajar, hay roturas u obstáculos en el recorrido, ruedas en mal estado, mal diseño del asa etc.)' },
      { id: 'p2_4', text: 'El objeto rodante no puede ser empujado y/o arrastrado con ambas manos, y en caso de que lo permita, el apoyo de las manos se encuentra a una altura incomoda (por encima del pecho o por debajo de la cintura)' },
      { id: 'p2_5', text: 'En el movimiento de empujar y/o arrastrar, el esfuerzo inicial requerido se mantiene significativamente una vez puesto en movimiento el objeto (se produce atascamiento de las ruedas, tirones o falta de deslizamiento uniforme)' },
      { id: 'p2_6', text: 'El trabajador empuja o arrastra el objeto rodante asiéndolo con una sola mano' },
      { id: 'p2_7', text: 'El trabajador presenta alguna manifestación temprana de las enfermedades mencionadas en el artículo 1 de la presente resolución' }
    ]
  },
  transporte: {
    code: '2.C',
    title: '2.C: TRANSPORTE MANUAL DE CARGAS',
    paso1: [
      { id: 'p1_1', text: 'Transporta manualmente carga superiores a 2 kg. Hasta 25 kg.' },
      { id: 'p1_2', text: 'El trabajador se desplaza sosteniendo manualmente la carga recorriendo una distancia mayor a 1 metro' },
      { id: 'p1_3', text: 'Realiza diariamente en forma cíclica (si es esporádica consignar NO)' },
      { id: 'p1_4', text: 'Se transporta manualmente cargas a una distancia superior a 20 mts.' },
      { id: 'p1_5', text: 'Se transporta manualmente cargas superiores a 25 kg.' }
    ],
    paso2: [
      { id: 'p2_1', text: 'En condiciones habituales de levantamiento el trabajador transporta la carga entre 1 y 10 metros con una masa acumulada (el producto de la masa por frecuencia) mayor que 10.000 kg durante la jornada habitual' },
      { id: 'p2_2', text: 'En condiciones habituales de levantamiento el trabajador transporta la carga entre 10 y 20 metros con una masa acumulada (el producto de la masa por la frecuencia) mayor a 6.000 kg durante la jornada habitual' },
      { id: 'p2_3', text: 'Las cargas poseen formas irregulares, son difíciles de asir, se deforman o hay movimientos en su interior' },
      { id: 'p2_4', text: 'El trabajador presenta alguna manifestación temprana de las enfermedades mencionadas en el artículo 1 de la presente Resolución' }
    ]
  },
  bipedestacion: {
    code: '2.D',
    title: '2.D: BIPEDESTACION',
    paso1: [
      { id: 'p1_1', text: 'El puesto de trabajo se desarrolla en posición de pie, sin posibilidad de sentarse durante 2 horas seguidas o mas' }
    ],
    paso2: [
      { id: 'p2_1', text: 'En el puesto se realizan tareas donde se permanece de pie durante 3 horas seguidas o más, sin posibilidades de sentarse con escasa deambulación (caminando no más de 100 mts. Por hora).' },
      { id: 'p2_2', text: 'En el puesto se realizan tareas donde se permanece de pie durante 2 horas seguidas o más, sin posibilidades de sentarse o con escasa deambulación levantando y transportando cargas > 2 kg.' },
      { id: 'p2_3', text: 'Trabajos efectuados con bipedestación prolongada en ambientes donde la temperatura y humedad del aire sobrepasan los limites legalmente admisibles y que demanden actividad física.' },
      { id: 'p2_4', text: 'El trabajador presenta alguna manifestación temprana de enfermedades mencionadas en el artículo 1° de la presente Resolución.' }
    ]
  },
  mov_repetitivos: {
    code: '2.E',
    title: '2.E: MOVIMIENTOS REPETITIVOS DE MIEMBROS SUPERIORES',
    paso1: [
      { id: 'p1_1', text: 'Realizar diariamente una o más tareas donde se utilizan las extremidades superiores, durante 4 o más horas en la jornada habitual de trabajo en forma cíclica (en forma continuada o alternada)' }
    ],
    paso2: [
      { id: 'p2_1', text: 'Las extremidades superiores están activas por más del 40% del tiempo total del ciclo de trabajo' },
      { id: 'p2_2', text: 'En el ciclo de trabajo se realiza un esfuerzo superior a moderado a 3 según la escala de Borg, durante más de 6 segundos y más de una vez por minuto.' },
      { id: 'p2_3', text: 'Se realiza un esfuerzo superior a 7 según la escala de Borg.' },
      { id: 'p2_4', text: 'El trabajador presenta alguna manifestación temprana de las enfermedades mencionadas en el artículo 1º de la presente resolución' }
    ]
  },
  posturas_forzadas: {
    code: '2.F',
    title: '2.F: POSTURAS FORZADAS',
    paso1: [
      { id: 'p1_1', text: 'Adoptar posturas forzadas en forma habitual durante la jornada de trabajo, con o sin aplicación de fuerza. (No se deben considerar si las posturas son ocasionales)' }
    ],
    paso2: [
      { id: 'p2_1', text: 'Cuello en extensión, flexión, lateralización y/o rotación' },
      { id: 'p2_2', text: 'Brazos por encima de los hombros o con movimientos de supinación, pronación o rotación' },
      { id: 'p2_3', text: 'Muñecas y manos en flexión, extensión desviación cubital o radial' },
      { id: 'p2_4', text: 'Cintura en flexión, extensión, lateralización y/o rotación' },
      { id: 'p2_5', text: 'Miembros inferiores: trabajo en posición de rodillas o cuclillas' },
      { id: 'p2_6', text: 'El trabajador presenta alguna manifestación temprana de las enfermedades mencionadas en el Artículo 1º de la presente resolución' }
    ]
  },
  vibraciones_mano_brazo: {
    code: '2.G',
    title: '2.G: VIBRACIONES MANO - BRAZO (entre 5 y 1500 hz)',
    paso1: [
      { id: 'p1_1', text: 'Trabajar con herramientas que producen vibraciones (martillo neumático, perforadora, destornilladores, pulidoras, esmeriladoras, otros).' },
      { id: 'p1_2', text: 'Sujetar piezas con las manos mientras estas son mecanizadas' },
      { id: 'p1_3', text: 'Sujetar palancas, volantes, etc. Que transmiten vibraciones' }
    ],
    paso2: [
      { id: 'p2_1', text: 'El valor de las vibraciones supera los límites establecidos en la Tabla I, de la parte correspondiente a Vibración (segmental) mano-brazo, del Anexo V, Resolución MTEySS Nº 295/03' },
      { id: 'p2_2', text: 'El trabajador presenta una manifestación temprana de las enfermedades mencionadas en el Artículo 1º de la presente Resolución' }
    ]
  },
  vibraciones_cuerpo_entero: {
    code: '2.G2',
    title: '2.G: VIBRACIONES CUERPO ENTERO (entre 1 y 80 hz)',
    paso1: [
      { id: 'p1_1', text: 'Conducir vehículos industriales, camiones, maquinas agrícolas, transporte público y otros.' },
      { id: 'p1_2', text: 'Trabajar próximo a máximas generadoras de impacto' }
    ],
    paso2: [
      { id: 'p2_1', text: 'El valor de las vibraciones supera los límites establecidos en la parte correspondiente a Vibración Cuerpo entero, del Anexo V. Resolución MTEySS Nº 295/03' },
      { id: 'p2_2', text: 'El trabajador presenta una manifestación temprana de las enfermedades mencionadas en el Artículo 1º de la presente Resolución' }
    ]
  },
  confort_termico: {
    code: '2.H',
    title: '2.H: CONFORT TERMICO',
    paso1: [
      { id: 'p1_1', text: 'En el puesto de trabajo se perciben temperaturas no confortables para la realización de tareas' }
    ],
    paso2: [
      { id: 'p2_1', text: 'Resultado del uso de la curva de Confort de Fanger, se encuentra por fuera de la zona de confort' }
    ]
  },
  estres_contacto: {
    code: '2.I',
    title: '2.I: ESTRÉS DE CONTACTO',
    paso1: [
      { id: 'p1_1', text: 'Mantener apoyada alguna parte del cuerpo ejerciendo una presión, contra una herramienta, plano de trabajo, máquina herramienta o partes y materiales' }
    ],
    paso2: [
      { id: 'p2_1', text: 'El trabajador mantiene apoyada la muñeca, antebrazo, axila o muslo u otro segmento corporal sobre una superficie aguda o con canto' },
      { id: 'p2_2', text: 'El trabajador utiliza herramientas de mano o manipula piezas que presionan sobre sus dedos y/o palma de la mano hábil' },
      { id: 'p2_3', text: 'El trabajador realiza movimientos de percusión sobre partes o herramientas' },
      { id: 'p2_4', text: 'El trabajador presenta alguna manifestación temprana de las enfermedades mencionadas en el Artículo 1º de la presente resolución' }
    ]
  }
};

const sumExposureTimes = (tList, factorKey) => {
  let totalMinutes = 0;
  let validCount = 0;
  const rawStrings = [];

  (tList || []).forEach(t => {
    const isIdentified = t[`f_${factorKey}_identificado`] === 'si';
    const timeStr = (t[`f_${factorKey}_tiempo`] || '').trim();

    if ((isIdentified || timeStr) && timeStr) {
      rawStrings.push(timeStr);
      const str = timeStr.toLowerCase().replace(',', '.');

      let mins = 0;
      let matched = false;

      const combinedMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:hs|h|horas?)\s*(\d+(?:\.\d+)?)\s*(?:min|mins|minutos?)/);
      if (combinedMatch) {
        mins = (parseFloat(combinedMatch[1]) * 60) + parseFloat(combinedMatch[2]);
        matched = true;
      } else {
        const hourMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:hs|h|horas?)/);
        if (hourMatch) {
          mins = parseFloat(hourMatch[1]) * 60;
          matched = true;
        } else {
          const minMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:min|mins|minutos?|m)/);
          if (minMatch) {
            mins = parseFloat(minMatch[1]);
            matched = true;
          } else {
            const numMatch = str.match(/^(\d+(?:\.\d+)?)$/);
            if (numMatch) {
              const val = parseFloat(numMatch[1]);
              if (val <= 24) mins = val * 60;
              else mins = val;
              matched = true;
            }
          }
        }
      }

      if (matched && !isNaN(mins)) {
        totalMinutes += mins;
        validCount++;
      }
    }
  });

  if (validCount > 0 && totalMinutes > 0) {
    const roundedMins = Math.round(totalMinutes * 100) / 100;
    if (roundedMins % 60 === 0) {
      return `${roundedMins / 60} hs`;
    } else if (roundedMins > 60) {
      const hrs = Math.floor(roundedMins / 60);
      const remMins = Math.round(roundedMins % 60);
      return remMins > 0 ? `${hrs} hs ${remMins} min` : `${hrs} hs`;
    } else {
      return `${roundedMins} min`;
    }
  }

  return rawStrings.join(', ') || '-';
};

export const generateProtocoloErgonomiaPdf = async (arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) => {
  let protocolo, empresa, establecimiento, userProfile, puntos, adjuntos;

  if (arg1 && typeof arg1 === 'object' && ('protocolo' in arg1 || 'puntos' in arg1 || 'userProfile' in arg1)) {
    protocolo = arg1.protocolo || {};
    empresa = arg1.empresa || {};
    establecimiento = arg1.establecimiento || {};
    userProfile = arg1.userProfile || {};
    puntos = arg1.puntos || [];
    adjuntos = arg1.adjuntos || [];
  } else {
    protocolo = arg1 || {};
    const empList = Array.isArray(arg3) ? arg3 : [];
    empresa = empList.find(e => e.id === protocolo.empresa_id) || empList[0] || {};
    const estList = Array.isArray(arg4) ? arg4 : [];
    establecimiento = estList.find(e => e.id === protocolo.establecimiento_id) || estList[0] || {};
    puntos = Array.isArray(arg5) ? arg5 : [];
    adjuntos = Array.isArray(arg6) ? arg6 : [];
    userProfile = arg8 || {};
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const COLOR_AZUL_PRINCIPAL = PDF_THEME.primary; // [70, 141, 255]
  const COLOR_SLATE_900 = PDF_THEME.textDark; // [13, 13, 13]
  const COLOR_SLATE_700 = [51, 65, 85];
  const COLOR_SLATE_600 = [71, 85, 105];
  const COLOR_SLATE_300 = [203, 213, 225];
  const COLOR_SLATE_200 = [226, 232, 240];
  const COLOR_NEGRO = [0, 0, 0];
  const COLOR_BLANCO = [255, 255, 255];

  const proto = protocolo || {};
  const emp = empresa || {};
  const est = establecimiento || {};
  const companyName = userProfile?.company_name || 'GESTIÓN SYSO';
  const phoneVal = userProfile?.phone || empresa?.telefono || '-';
  const emailVal = userProfile?.email || empresa?.email || '-';

  const tenantObj = (typeof arg2 === 'object' && !Array.isArray(arg2)) ? arg2 : {};

  // Safe logo fetch (Prioritize Admin/Owner Profile & Tenant Primary Logo)
  let logoBase64 = '';
  let logoUrl = tenantObj?.logo_1_url || tenantObj?.logo_url || userProfile?.logo_1_url || userProfile?.logo_url;

  if (!logoUrl && (proto.tenant_id || tenantObj?.id)) {
    try {
      const targetTenantId = proto.tenant_id || tenantObj?.id;
      const { data: adminProf } = await supabase
        .from('profiles')
        .select('logo_1_url, logo_url')
        .eq('tenant_id', targetTenantId)
        .in('role', ['admin', 'owner'])
        .not('logo_url', 'is', null)
        .limit(1)
        .maybeSingle();

      if (adminProf) {
        logoUrl = adminProf.logo_1_url || adminProf.logo_url;
      }
    } catch (err) {
      console.warn('Warning fetching admin profile logo:', err);
    }
  }

  if (logoUrl) {
    try {
      const rawLogo = await getBase64ImageFromUrl(logoUrl);
      if (rawLogo && rawLogo.startsWith('data:image/')) {
        logoBase64 = rawLogo;
      }
    } catch (err) {
      console.warn('Warning loading primary logo URL:', err);
    }
  }

  if (!logoBase64 || !logoBase64.startsWith('data:image/')) {
    logoBase64 = await getBase64ImageFromUrl('/brand/logo-primary.png');
  }
  if (!logoBase64 || !logoBase64.startsWith('data:image/')) {
    logoBase64 = '';
  }
  const logoDims = logoBase64 ? await getImgDimensions(logoBase64) : { width: 120, height: 50 };

  // Fetch signature Base64 for all 3 signees (H&S, Empleador, Medicina Laboral)
  const firmaProfTarget = proto.firma_profesional || userProfile?.signature_url || '';
  const firmaProfBase64 = await fetchSignatureImage(firmaProfTarget);
  const firmaProfDims = firmaProfBase64 ? await getImgDimensions(firmaProfBase64) : { width: 120, height: 50 };

  const firmaEmpleadorTarget = proto.firma_empleador || '';
  const firmaEmpleadorBase64 = await fetchSignatureImage(firmaEmpleadorTarget);
  const firmaEmpleadorDims = firmaEmpleadorBase64 ? await getImgDimensions(firmaEmpleadorBase64) : { width: 120, height: 50 };

  const firmaMedicinaTarget = proto.firma_medicina || '';
  const firmaMedicinaBase64 = await fetchSignatureImage(firmaMedicinaTarget);
  const firmaMedicinaDims = firmaMedicinaBase64 ? await getImgDimensions(firmaMedicinaBase64) : { width: 120, height: 50 };

  // Data Getters for Signees Names & Licenses
  const profNombre = proto.profesional_nombre || userProfile?.full_name || '';
  let profMatricula = proto.profesional_matricula || '';
  if (!profMatricula && userProfile) {
    if (userProfile.matricula_institucion && userProfile.matricula_numero) {
      profMatricula = `${userProfile.matricula_institucion} N° ${userProfile.matricula_numero}`;
    } else if (userProfile.matricula_numero) {
      profMatricula = `Mat. N° ${userProfile.matricula_numero}`;
    }
  }

  const empleadorNombre = proto.empleador_nombre || proto.responsable_empresa_nombre || proto.responsable_empresa || '';
  const medicinaNombre = proto.medicina_nombre || proto.medico_nombre || proto.responsable_medicina_nombre || '';
  const medicinaMatricula = proto.medicina_matricula || proto.medico_matricula || '';

  // Helper: Draw Aspect-Ratio Preserved Signature (No Stretching)
  const drawAspectSignature = (base64, dims, colCenterX, lineY, maxW = 56, maxH = 32) => {
    if (!base64 || !base64.startsWith('data:image/')) return;
    try {
      const ratio = (dims?.width && dims?.height) ? (dims.width / dims.height) : 2.2;
      let renderW = maxW;
      let renderH = maxW / ratio;
      if (renderH > maxH) {
        renderH = maxH;
        renderW = maxH * ratio;
      }
      const renderX = colCenterX - (renderW / 2);
      const renderY = lineY - (renderH * 0.78);

      doc.addImage(base64, 'PNG', renderX, renderY, renderW, renderH, undefined, 'FAST');
    } catch (e) {
      console.warn('Error drawing signature image:', e);
    }
  };

  // Calculate total pages for footer (Cover + Intro + Diagrama + Datos + Planilla1 + Planilla2 pages + Planilla3 pages + Planilla4)
  const ALL_FACTOR_KEYS = [
    'levantamiento', 'empuje_arrastre', 'transporte', 'bipedestacion',
    'mov_repetitivos', 'posturas_forzadas', 'vibraciones_mano_brazo',
    'vibraciones_cuerpo_entero', 'confort_termico', 'estres_contacto'
  ];

  const factorsDef = [
    { key: 'levantamiento', code: 'A', label: 'Levantamiento y descenso' },
    { key: 'empuje_arrastre', code: 'B', label: 'Empuje / Arrastre' },
    { key: 'transporte', code: 'C', label: 'Transporte' },
    { key: 'bipedestacion', code: 'D', label: 'Bipedestación' },
    { key: 'mov_repetitivos', code: 'E', label: 'Movimientos Repetitivos de MMSS' },
    { key: 'posturas_forzadas', code: 'F', label: 'Posturas Forzadas' },
    { key: 'vibraciones_mano_brazo', code: 'G', label: 'Vibraciones' },
    { key: 'confort_termico', code: 'H', label: 'Confort Térmico' },
    { key: 'estres_contacto', code: 'I', label: 'Estrés de Contacto' }
  ];

  const puntosList = puntos.length > 0 ? puntos : [{}];
  let totalPagesCount = 3; // Cover, Intro, Diagrama

  puntosList.forEach(pt => {
    const tList = pt.tareas || [];
    const p1PagesCount = Math.max(1, Math.ceil(tList.length / 3));
    totalPagesCount += p1PagesCount; // Planilla 1 (de a 3 tareas por página)

    tList.forEach(t => {
      ALL_FACTOR_KEYS.forEach(fKey => {
        if (t[`f_${fKey}_identificado`] === 'si') totalPagesCount++; // Planilla 2
      });
      totalPagesCount++; // Planilla 3
    });
    totalPagesCount++; // Planilla 4
  });

  // Helper text renderer with auto-sanitization for unicode width issues
  const drawCellText = (docInst, text, x, y, w, h, options = {}) => {
    const {
      align = 'left',
      valign = 'middle',
      fontSize = 7.5,
      fontStyle = 'normal',
      color = COLOR_NEGRO,
      padding = 1.2,
      maxLines = 0
    } = options;

    docInst.setFont('helvetica', fontStyle);
    docInst.setFontSize(fontSize);
    setTextColor(docInst, color);

    let cleanText = String(text !== null && text !== undefined ? text : '')
      .replace(/≥/g, '>=')
      .replace(/≤/g, '<=');

    const availableW = Math.max(2, w - (padding * 2));
    let lines = docInst.splitTextToSize(cleanText, availableW);

    if (maxLines > 0 && lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      if (lines[maxLines - 1]) {
        lines[maxLines - 1] = lines[maxLines - 1].replace(/\.?\s*$/, '...');
      }
    }

    const lineHeight = fontSize * 0.3527 * 1.15;
    const totalTextH = lines.length * lineHeight;

    let startY = y + padding + (lineHeight * 0.75);
    if (valign === 'middle') {
      startY = y + (h - totalTextH) / 2 + (lineHeight * 0.75);
    } else if (valign === 'bottom') {
      startY = y + h - padding - (totalTextH - lineHeight);
    }

    lines.forEach((line, idx) => {
      let posX = x + padding;
      if (align === 'center') posX = x + (w / 2);
      else if (align === 'right') posX = x + w - padding;

      docInst.text(line, posX, startY + (idx * lineHeight), { align });
    });
  };

  // Helper: Header Box (always sets fill and draw color explicitly before drawing rect)
  const drawHeaderBox = (x, y, w, h, text, opts = {}) => {
    setFillColor(doc, COLOR_SLATE_200);
    setDrawColor(doc, COLOR_NEGRO);
    doc.setLineWidth(0.25);
    doc.rect(x, y, w, h, 'FD');
    drawCellText(doc, text, x, y, w, h, {
      align: 'center',
      fontStyle: 'bold',
      fontSize: 6.5,
      color: COLOR_NEGRO,
      ...opts
    });
  };

  // Helper: Header Logo (Top Left)
  const drawHeaderLogo = () => {
    if (!logoBase64 || !logoBase64.startsWith('data:image/')) return;
    const maxW = 42;
    const maxH = 16;
    const ratio = (logoDims?.width && logoDims?.height) ? (logoDims.width / logoDims.height) : 2.5;

    let renderW = maxW;
    let renderH = maxW / ratio;
    if (renderH > maxH) {
      renderH = maxH;
      renderW = maxH * ratio;
    }

    const x = 15;
    const y = 8 + (maxH - renderH) / 2;

    try {
      doc.addImage(logoBase64, 'PNG', x, y, renderW, renderH, undefined, 'FAST');
    } catch (err) {
      console.warn('Warning drawing header logo:', err);
    }
  };

  const fechaEval = proto.fecha_medicion || proto.fecha_estudio || proto.fecha_evaluacion || proto.fecha || proto.created_at;
  const fechaFormatted = fechaEval ? formatDate(fechaEval) : '';

  // Helper: Inner Page Footer (Matching Ruido and Iluminacion standard)
  const drawFooter = (pageNum = 1, totalPages = 1) => {
    const startX = 15;
    const endX = 195;
    const barY = 281;
    const textY = 285.5;
    const subFooterY = 289.5;
    const totalW = endX - startX;

    setDrawColor(doc, COLOR_AZUL_PRINCIPAL);
    doc.setLineWidth(0.35);
    doc.line(startX, barY, endX, barY);

    const boldText = companyName;
    const normalText = `  •  Tel: ${phoneVal}  •  Email: ${emailVal}`;

    doc.setFontSize(7.5);
    setTextColor(doc, COLOR_SLATE_700);

    doc.setFont('helvetica', 'bold');
    const boldWidth = doc.getTextWidth(boldText);

    doc.setFont('helvetica', 'normal');
    const normalWidth = doc.getTextWidth(normalText);

    const totalTextWidth = boldWidth + normalWidth;
    const lineStartX = startX + (totalW / 2) - (totalTextWidth / 2);

    doc.setFont('helvetica', 'bold');
    doc.text(boldText, lineStartX, textY);

    doc.setFont('helvetica', 'normal');
    doc.text(normalText, lineStartX + boldWidth, textY);

    // Fecha de evaluación (a partir de la Hoja 4) encima del número de página
    doc.setFontSize(7.5);
    setTextColor(doc, COLOR_SLATE_600);
    if (pageNum >= 4 && fechaFormatted) {
      doc.setFont('helvetica', 'normal');
      doc.text(fechaFormatted, endX, textY, { align: 'right' });
    }

    doc.setFont('helvetica', 'bold');
    doc.text(`Página ${pageNum} de ${totalPages}`, endX, subFooterY, { align: 'right' });
  };

  // Helper: Triple Signatures Block (with dotted lines, enlarged aspect-ratio-scaled signature images, names & matrículas for all 3 roles)
  const drawTripleSignatureBlock = (y = 248) => {
    setDrawColor(doc, COLOR_NEGRO);
    doc.setLineWidth(0.25);

    // ==================== COL 1: EMPLEADOR (15 to 65, center = 40) ====================
    drawAspectSignature(firmaEmpleadorBase64, firmaEmpleadorDims, 40, y, 48, 30);
    let currX = 15;
    while (currX < 65) {
      doc.line(currX, y, Math.min(currX + 1.5, 65), y);
      currX += 2.5;
    }
    drawCellText(doc, 'Firma del empleador', 15, y + 1.5, 50, 4, { align: 'center', fontSize: 6.5, fontStyle: 'bold' });
    if (empleadorNombre) {
      drawCellText(doc, empleadorNombre, 15, y + 7.5, 50, 4, { align: 'center', fontSize: 6.5, fontStyle: 'bold' });
    }

    // ==================== COL 2: HIGIENE Y SEGURIDAD (75 to 135, center = 105) ====================
    drawAspectSignature(firmaProfBase64, firmaProfDims, 105, y, 58, 34);
    currX = 75;
    while (currX < 135) {
      doc.line(currX, y, Math.min(currX + 1.5, 135), y);
      currX += 2.5;
    }
    drawCellText(doc, 'Firma del responsable del servicio de\nhigiene y seguridad', 75, y + 1.5, 60, 6, { align: 'center', fontSize: 6.5, fontStyle: 'bold' });
    if (profNombre) {
      drawCellText(doc, profNombre, 75, y + 8, 60, 4, { align: 'center', fontSize: 6.5, fontStyle: 'bold' });
    }
    if (profMatricula) {
      drawCellText(doc, profMatricula, 75, y + 12, 60, 4, { align: 'center', fontSize: 5.5, fontStyle: 'normal' });
    }

    // ==================== COL 3: MEDICINA LABORAL (145 to 195, center = 170) ====================
    drawAspectSignature(firmaMedicinaBase64, firmaMedicinaDims, 170, y, 48, 30);
    currX = 145;
    while (currX < 195) {
      doc.line(currX, y, Math.min(currX + 1.5, 195), y);
      currX += 2.5;
    }
    drawCellText(doc, 'Firma del responsable del servicio\nde medicina del trabajo', 145, y + 1.5, 50, 6, { align: 'center', fontSize: 6.5, fontStyle: 'bold' });
    if (medicinaNombre) {
      drawCellText(doc, medicinaNombre, 145, y + 8, 50, 4, { align: 'center', fontSize: 6.5, fontStyle: 'bold' });
    }
    if (medicinaMatricula) {
      drawCellText(doc, medicinaMatricula, 145, y + 12, 50, 4, { align: 'center', fontSize: 5.5, fontStyle: 'normal' });
    }
  };

  // Data Getters for establishment
  const razonSocial = proto.razon_social_text || emp?.razon_social || '-';
  const cuit = proto.cuit_text || emp?.cuit || '-';
  const ciiu = proto.ciiu_text || (emp?.actividades_ciiu || []).join(', ') || '-';
  const direccion = proto.direccion_text || est?.direccion || '-';
  const localidad = proto.localidad_text || est?.localidad || '-';
  const provincia = proto.provincia_text || est?.provincia || '-';
  const cp = proto.cp_text || est?.cp || '-';

  // ==========================================
  // HOJA 1: CARÁTULA / PORTADA (A4 Vertical)
  // ==========================================
  setDrawColor(doc, COLOR_AZUL_PRINCIPAL);
  doc.setLineWidth(0.4);
  doc.rect(10, 10, 190, 277, 'S');

  // Year Rectangle
  const currentYear = proto.fecha_medicion ? new Date(proto.fecha_medicion).getFullYear() : new Date().getFullYear();
  setFillColor(doc, COLOR_AZUL_PRINCIPAL);
  doc.rect(168, 15, 20, 28, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  setTextColor(doc, COLOR_BLANCO);
  doc.text(String(currentYear), 178, 32, { align: 'center' });

  // Main Cover Logo (Admin Profile Logo)
  if (logoBase64 && logoBase64.startsWith('data:image/')) {
    const maxCoverW = 85;
    const maxCoverH = 45;
    const ratio = (logoDims?.width && logoDims?.height) ? (logoDims.width / logoDims.height) : 2.5;
    let coverW = maxCoverW;
    let coverH = maxCoverW / ratio;
    if (coverH > maxCoverH) {
      coverH = maxCoverH;
      coverW = maxCoverH * ratio;
    }
    const coverX = 39 + (maxCoverW - coverW) / 2;
    const coverY = 105 + (maxCoverH - coverH) / 2;
    try {
      doc.addImage(logoBase64, 'PNG', coverX, coverY, coverW, coverH, undefined, 'FAST');
    } catch (e) {
      console.error('Error drawing cover logo:', e);
    }
  }

  // Cover Main Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(30);
  setTextColor(doc, COLOR_AZUL_PRINCIPAL);
  const titleLines = doc.splitTextToSize('Protocolo de Ergonomía', 145);
  doc.text(titleLines, 39, 172);

  // Normative reference
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'normal');
  setTextColor(doc, COLOR_SLATE_600);
  doc.text('ANEXO I - RESOLUCIÓN 295 / 2003', 39, 222);
  doc.text('ANEXO I - RESOLUCIÓN SRT 886 / 2015 (PROTOCOLO DE ERGONOMÍA)', 39, 228);

  // Brand / Consultora
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  setTextColor(doc, COLOR_SLATE_900);
  doc.text(companyName.toUpperCase(), 39, 246);

  let pageCounter = 1;

  // ==========================================
  // HOJA 2: INTRODUCCIÓN
  // ==========================================
  doc.addPage('a4', 'portrait');
  pageCounter++;

  drawHeaderLogo();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setTextColor(doc, COLOR_NEGRO);
  doc.text('Introducción', 15, 28);
  setDrawColor(doc, COLOR_AZUL_PRINCIPAL);
  doc.setLineWidth(0.4);
  doc.line(15, 30, 195, 30);

  let currentY = 38;

  const printParagraph = (pText, isBold = false) => {
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(9);
    setTextColor(doc, COLOR_NEGRO);
    const lines = doc.splitTextToSize(pText, 180);
    doc.text(lines, 15, currentY);
    currentY += (lines.length * 4.2) + 3;
  };

  const printBullet = (bText) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    setTextColor(doc, COLOR_NEGRO);
    doc.text('•  ' + bText, 19, currentY);
    currentY += 4.5;
  };

  printParagraph('La palabra “Ergonomía” tiene su origen en la expresión griega ergos (trabajo) y nomos (ley, regla), es la disciplina que estudia las condiciones en que se realiza el trabajo humano y la persona que lo ejecuta.');
  printParagraph('El objetivo de la ergonomía es mejorar la calidad de las condiciones, los entornos y los instrumentos de trabajo con el fin de optimizar la eficacia y eficiencia de las personas. Se basa en conocimientos y experiencias derivadas tanto de estudios experimentales como de estudios sobre terreno (en el puesto de trabajo). Como tal, es un instrumento integrador, orientado a incrementar la seguridad, la salud y el bienestar de los trabajadores.');

  currentY += 2;
  printParagraph('Resolución MTESS Nº 295 / 2003 - Anexo I', true);
  printParagraph('La Resolución MTESS Nº 295 / 2003, incorpora a la normativa vigente (Ley 19587 – Higiene y Seguridad en el trabajo) lineamientos específicos sobre ergonomía.');
  printParagraph('En las “Especificaciones Técnicas de Ergonomía”, menciona los causales a considerar para prevenir el daño al trabajador por los factores de riesgo que se pueden presentar en las tareas del puesto de trabajo. Entre ellos:');

  printBullet('Levantamiento manual de cargas');
  printBullet('Transporte manual de cargas');
  printBullet('Empuje y/o arrastre manual de cargas');
  printBullet('Trabajos repetitivos');
  printBullet('Posturas extremas (estáticas o dinámicas)');
  printBullet('Vibraciones (mano brazo; cuerpo entero)');
  printBullet('Estrés de contacto');
  printBullet('Estrés por el calor o frío');
  printBullet('Duración del trabajo');

  currentY += 2;
  printParagraph('Resolución SRT Nº 886 / 2015', true);
  printParagraph('La Resolución SRT Nº 886 / 2015 unifica los criterios para la prevención de las enfermedades profesionales relacionadas con los trastornos musculoesqueléticos, hernias inguinales directas, mixtas y crurales, hernia discal lumbosacra con o sin compromiso radicular que afecte a un solo segmento columnario y várices primitivas bilaterales desde una metodología de abordaje de origen multicausal.');
  printParagraph('En este sentido, incorpora el uso de un protocolo estandarizado, para facilitar la evaluación de los factores de riesgo, el estudio ergonómico y la identificación de las medidas correctivas y preventivas.');
  printParagraph('El mismo está conformado por cuatro planillas que se utilizan para:');

  printBullet('Identificación de Factores de Riesgo');
  printBullet('Evaluación Inicial de Factores de Riesgo');
  printBullet('Identificación de Medidas Preventivas Generales y Específicas');
  printBullet('Seguimiento de Medidas Correctivas y Preventivas');

  currentY += 2;
  printParagraph('Su objetivo práctico es identificar los factores de riesgos presentes en las tareas del puesto de trabajo, los cuales resultan fácilmente observables a partir de la aplicación de criterios técnicos, y verificar si una tarea comporta un nivel de riesgo Tolerable o No Tolerable.');

  drawFooter(pageCounter, totalPagesCount);

  // ==========================================
  // HOJA 3: DIAGRAMA DE FLUJO (Diseño Profesional Estandarizado)
  // ==========================================
  doc.addPage('a4', 'portrait');
  pageCounter++;

  drawHeaderLogo();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setTextColor(doc, COLOR_NEGRO);
  doc.text('DIAGRAMA DE FLUJO - RES. S.R.T. 886/15', 15, 28);
  setDrawColor(doc, COLOR_AZUL_PRINCIPAL);
  doc.setLineWidth(0.4);
  doc.line(15, 30, 195, 30);

  // Flowchart Vector Drawing Helpers
  const drawFlowArrow = (x1, y1, x2, y2, opts = {}) => {
    const { color = COLOR_SLATE_700, thickness = 0.35, arrowSize = 2.2 } = opts;
    setDrawColor(doc, color);
    setFillColor(doc, color);
    doc.setLineWidth(thickness);

    doc.line(x1, y1, x2, y2);

    const angle = Math.atan2(y2 - y1, x2 - x1);
    const p1x = x2;
    const p1y = y2;
    const p2x = x2 - arrowSize * Math.cos(angle - Math.PI / 6);
    const p2y = y2 - arrowSize * Math.sin(angle - Math.PI / 6);
    const p3x = x2 - arrowSize * Math.cos(angle + Math.PI / 6);
    const p3y = y2 - arrowSize * Math.sin(angle + Math.PI / 6);

    doc.triangle(p1x, p1y, p2x, p2y, p3x, p3y, 'F');
  };

  const drawProcessBox = (x, y, w, h, title, subtitle, opts = {}) => {
    const {
      bgColor = COLOR_BLANCO,
      borderColor = COLOR_AZUL_PRINCIPAL,
      titleColor = COLOR_SLATE_900,
      subColor = COLOR_AZUL_PRINCIPAL,
      barColor = COLOR_AZUL_PRINCIPAL
    } = opts;

    setFillColor(doc, bgColor);
    setDrawColor(doc, borderColor);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, y, w, h, 3, 3, 'FD');

    // Left accent vertical bar
    setFillColor(doc, barColor);
    doc.roundedRect(x, y, 3.5, h, 1.5, 1.5, 'F');

    // Title text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    setTextColor(doc, titleColor);
    doc.text(title, x + 7, y + (subtitle ? 6.5 : 10.5));

    // Subtitle text
    if (subtitle) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      setTextColor(doc, subColor);
      doc.text(subtitle, x + 7, y + 12.5);
    }
  };

  const drawPillBadge = (cx, cy, text, opts = {}) => {
    const {
      bgColor = COLOR_BLANCO,
      borderColor = COLOR_SLATE_300,
      textColor = COLOR_SLATE_700,
      fontSize = 6.5
    } = opts;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fontSize);
    const txtW = doc.getTextWidth(text);
    const padX = 3.5;
    const badgeW = txtW + (padX * 2);
    const badgeH = 5.5;

    const startX = cx - (badgeW / 2);
    const startY = cy - (badgeH / 2);

    setFillColor(doc, bgColor);
    setDrawColor(doc, borderColor);
    doc.setLineWidth(0.3);
    doc.roundedRect(startX, startY, badgeW, badgeH, 2, 2, 'FD');

    setTextColor(doc, textColor);
    doc.text(text, cx, cy + 1, { align: 'center' });
  };

  // Dimensions & Positions for Process Boxes
  const boxX = 22;
  const boxW = 92;
  const boxH = 16;
  const colCenterX = boxX + (boxW / 2); // 68

  // Box 1: Planilla 1
  const b1Y = 42;
  drawProcessBox(boxX, b1Y, boxW, boxH, '1. Identificación de Factores de Riesgo', '(ANEXO I - PLANILLA 1)', {
    borderColor: COLOR_AZUL_PRINCIPAL,
    barColor: COLOR_AZUL_PRINCIPAL
  });

  // Box 2: Planilla 2
  const b2Y = 82;
  drawProcessBox(boxX, b2Y, boxW, boxH, '2. Evaluación Inicial de Factores de Riesgo', '(ANEXO I - PLANILLA 2)', {
    borderColor: COLOR_AZUL_PRINCIPAL,
    barColor: COLOR_AZUL_PRINCIPAL
  });

  // Box 3: Evaluación de Riesgos
  const b3Y = 122;
  drawProcessBox(boxX, b3Y, boxW, boxH, '3. Evaluación de Riesgos', '(Especialista en Ergonomía / Ergónomo)', {
    borderColor: COLOR_SLATE_700,
    barColor: COLOR_SLATE_700,
    subColor: COLOR_SLATE_600
  });

  // Box 4: Planilla 3
  const b4Y = 162;
  drawProcessBox(boxX, b4Y, boxW, boxH, '4. Identificación de Medidas Correctivas y Preventivas', '(ANEXO I - PLANILLA 3)', {
    borderColor: COLOR_AZUL_PRINCIPAL,
    barColor: COLOR_AZUL_PRINCIPAL
  });

  // Box 5: Planilla 4
  const b5Y = 202;
  drawProcessBox(boxX, b5Y, boxW, boxH, '5. Seguimiento de Medidas Preventivas', '(ANEXO I - PLANILLA 4)', {
    borderColor: COLOR_AZUL_PRINCIPAL,
    barColor: COLOR_AZUL_PRINCIPAL
  });

  // Main Downward Vertical Arrows & Badges
  // Arrow Box 1 -> Box 2
  drawFlowArrow(colCenterX, b1Y + boxH, colCenterX, b2Y, { color: COLOR_SLATE_700, thickness: 0.4 });
  drawPillBadge(colCenterX, b1Y + boxH + 12, 'Si se identificaron F. de R.');

  // Arrow Box 2 -> Box 3
  drawFlowArrow(colCenterX, b2Y + boxH, colCenterX, b3Y, { color: COLOR_SLATE_700, thickness: 0.4 });
  drawPillBadge(colCenterX, b2Y + boxH + 12, 'Si el riesgo es NO tolerable');

  // Arrow Box 3 -> Box 4
  drawFlowArrow(colCenterX, b3Y + boxH, colCenterX, b4Y, { color: COLOR_SLATE_700, thickness: 0.4 });
  drawPillBadge(colCenterX, b3Y + boxH + 12, 'Si el riesgo es NO tolerable');

  // Arrow Box 4 -> Box 5
  drawFlowArrow(colCenterX, b4Y + boxH, colCenterX, b5Y, { color: COLOR_SLATE_700, thickness: 0.4 });

  // Right Return Rail (Loopback System)
  const railX = 132;

  // Connection 1: Box 1 -> Return Rail (Si NO se identificaron F. de R.)
  setDrawColor(doc, COLOR_SLATE_600);
  doc.setLineWidth(0.35);
  doc.line(boxX + boxW, b1Y + 8, railX, b1Y + 8);
  drawPillBadge(boxX + boxW + 10, b1Y + 8, 'Si NO se identificaron F. de R. *', { fontSize: 6 });

  // Connection 2: Box 2 -> Return Rail (Si el riesgo es tolerable)
  doc.line(boxX + boxW, b2Y + 8, railX, b2Y + 8);
  drawPillBadge(boxX + boxW + 10, b2Y + 8, 'Si el riesgo es tolerable *', { fontSize: 6 });

  // Connection 3: Box 5 -> Bottom Loop -> Return Rail -> Box 3 (Colocar resultado en Planilla 1)
  const b5BottomY = b5Y + (boxH / 2); // 210
  doc.line(boxX + boxW, b5BottomY, railX, b5BottomY);
  drawPillBadge(boxX + boxW + 10, b5BottomY, 'Colocar resultado en Planilla 1', { fontSize: 6 });

  // Vertical Return Rail Line
  doc.line(railX, b1Y + 8, railX, b5BottomY);

  // Return Arrow from Rail into Box 3 (Planilla 1 entry)
  drawFlowArrow(railX, b3Y + 8, boxX + boxW, b3Y + 8, { color: COLOR_SLATE_600, thickness: 0.4 });

  // Return Arrow pointing up into Box 1 top rail
  drawFlowArrow(railX, b1Y + 12, railX, b1Y + 8, { color: COLOR_SLATE_600, thickness: 0.4 });

  // Side Note Card (Bottom Right)
  const noteX = 124;
  const noteY = 122;
  const noteW = 71;
  const noteH = 75;

  setFillColor(doc, [248, 250, 252]); // Slate-50 soft bg
  setDrawColor(doc, COLOR_SLATE_300);
  doc.setLineWidth(0.35);
  doc.roundedRect(noteX, noteY, noteW, noteH, 3.5, 3.5, 'FD');

  // Note Card Header Bar
  setFillColor(doc, COLOR_SLATE_200);
  doc.roundedRect(noteX, noteY, noteW, 8, 3.5, 3.5, 'F');
  doc.rect(noteX, noteY + 4, noteW, 4, 'F'); // Square bottom corners of header bar

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  setTextColor(doc, COLOR_AZUL_PRINCIPAL);
  doc.text('* NOTA NORMATIVA (Res. SRT 886/15)', noteX + 4, noteY + 5.5);

  const noteParagraph = 'Si el riesgo es tolerable, realizar una nueva identificación de Factores de Riesgo a los DOCE (12) meses o al momento siguiente de presentarse alguna manifestación temprana de enfermedad de las mencionadas en el artículo 1° de la Resolución, un accidente de trabajo o cambios de ingeniería o proceso.';

  drawCellText(doc, noteParagraph, noteX + 2, noteY + 10, noteW - 4, noteH - 12, {
    align: 'left',
    valign: 'top',
    fontSize: 6.8,
    color: COLOR_SLATE_700
  });

  drawFooter(pageCounter, totalPagesCount);

  // ==========================================
  // HOJAS 4+: PLANILLA 1 POR PUESTO DE TRABAJO (A4 Vertical)
  // ==========================================
  puntosList.forEach((pt, ptIdx) => {
    const tList = pt.tareas || [];
    const taskChunks = [];
    for (let i = 0; i < tList.length; i += 3) {
      taskChunks.push(tList.slice(i, i + 3));
    }
    if (taskChunks.length === 0) {
      taskChunks.push([]);
    }

    taskChunks.forEach((chunk, chunkIdx) => {
      doc.addPage('a4', 'portrait');
      pageCounter++;

      drawHeaderLogo();

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      setTextColor(doc, COLOR_NEGRO);
      doc.text('RESOLUCIÓN S.R.T. 886/15', 15, 28);
      doc.text('ANEXO I- PLANILLA 1: IDENTIFICACION DE FACTORES DE RIESGO', 15, 33);
      setDrawColor(doc, COLOR_SLATE_300);
      doc.setLineWidth(0.25);
      doc.line(15, 35, 195, 35);

      let p1Y = 40;

      // Official Res. SRT 886/15 Planilla 1 Header Table (Datos del establecimiento y puesto)
      const hdrX = 15;
      let hdrY = p1Y;
      const hdrW = 180;
      const rH = 5.5;

      setDrawColor(doc, COLOR_NEGRO);
      doc.setLineWidth(0.25);

      // Helper for key-value cell inside header table
      const drawHdrCell = (xPos, yPos, wLen, hLen, keyText, valText) => {
        doc.rect(xPos, yPos, wLen, hLen, 'S');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        setTextColor(doc, COLOR_NEGRO);
        const kStr = keyText + ': ';
        const kW = doc.getTextWidth(kStr);
        doc.text(kStr, xPos + 1.5, yPos + 3.8);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        const vStr = String(valText !== null && valText !== undefined && valText !== '' ? valText : '-');
        const maxVW = Math.max(5, wLen - kW - 3);
        const lines = doc.splitTextToSize(vStr, maxVW);
        doc.text(lines[0] || '-', xPos + 1.5 + kW, yPos + 3.8);
      };

      // Row 1: Razón Social / C.U.I.T. (50% / 50%)
      drawHdrCell(hdrX, hdrY, 90, rH, 'Razón Social', razonSocial);
      drawHdrCell(hdrX + 90, hdrY, 90, rH, 'C.U.I.T.', cuit);
      hdrY += rH;

      // Row 2: CIIU (100%)
      drawHdrCell(hdrX, hdrY, 180, rH, 'CIIU', ciiu);
      hdrY += rH;

      // Row 3: Dirección del establecimiento / Provincia (50% / 50%)
      const dirFull = direccion + (localidad && localidad !== '-' ? `, ${localidad}` : '');
      drawHdrCell(hdrX, hdrY, 90, rH, 'Dirección del establecimiento', dirFull);
      drawHdrCell(hdrX + 90, hdrY, 90, rH, 'Provincia', provincia + (cp && cp !== '-' ? ` (CP ${cp})` : ''));
      hdrY += rH;

      // Row 4: Área y Sector en estudio / N° de trabajadores (50% / 50%)
      drawHdrCell(hdrX, hdrY, 90, rH, 'Área y Sector en estudio', pt.sector_text || pt.sector || '-');
      drawHdrCell(hdrX + 90, hdrY, 90, rH, 'N° de trabajadores', String(pt.cantidad_expuestos || 1));
      hdrY += rH;

      // Row 5: Puesto de trabajo / Capacitación (50% / 50%)
      drawHdrCell(hdrX, hdrY, 90, rH, 'Puesto de trabajo', pt.puesto_text || pt.puesto || '-');
      drawHdrCell(hdrX + 90, hdrY, 90, rH, 'Capacitación', (pt.capacitacion || 'no') === 'si' ? 'SI' : 'NO');
      hdrY += rH;

      // Row 6: Procedimiento escrito / Nombre del trabajador/es (50% / 50%)
      drawHdrCell(hdrX, hdrY, 90, rH, 'Procedimiento escrito', (pt.procedimiento_escrito || 'no') === 'si' ? 'SI' : 'NO');
      drawHdrCell(hdrX + 90, hdrY, 90, rH, 'Nombre del trabajador/es', pt.nombres_trabajadores || '-');
      hdrY += rH;

      // Row 7: Manifestación temprana / Ubicación del síntoma (50% / 50%)
      drawHdrCell(hdrX, hdrY, 90, rH, 'Manifestación temprana', (pt.manifestacion_temprana || 'no') === 'si' ? 'SI' : 'NO');
      drawHdrCell(hdrX + 90, hdrY, 90, rH, 'Ubicación del síntoma', pt.ubicacion_sintoma || '-');
      hdrY += rH;

      p1Y = hdrY + 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      setTextColor(doc, COLOR_NEGRO);
      const step1Lines = doc.splitTextToSize('Paso 1: Identificar para el puesto de trabajo, las tareas y los factores de riesgo que se presentan de forma habitual en cada una de ellas.', 180);
      doc.text(step1Lines, 15, p1Y);
      p1Y += (step1Lines.length * 3.8) + 4;

      // Tabla Matricial Planilla 1
      const tblX = 15;
      const colY = p1Y;

      const t1 = chunk[0];
      const t2 = chunk[1];
      const t3 = chunk[2];

      const startTaskNum = (chunkIdx * 3) + 1;
      const num1 = startTaskNum;
      const num2 = startTaskNum + 1;
      const num3 = startTaskNum + 2;

      // Col 1: Factor de riesgo (60mm)
      drawHeaderBox(tblX, colY, 60, 16, 'Factor de riesgo de la\njornada habitual de trabajo', { fontSize: 7, maxLines: 2 });

      // Col 2: Tareas Habituales (60mm total: 20mm each)
      drawHeaderBox(tblX + 60, colY, 60, 6, 'Tareas habituales del Puesto de Trabajo', { fontSize: 6.5 });
      drawHeaderBox(tblX + 60, colY + 6, 20, 10, t1 ? `Tarea ${num1}:\n${t1.nombre || '-'}` : `Tarea ${num1}:\n-`, { fontSize: 5.5, maxLines: 2 });
      drawHeaderBox(tblX + 80, colY + 6, 20, 10, t2 ? `Tarea ${num2}:\n${t2.nombre || '-'}` : `Tarea ${num2}:\n-`, { fontSize: 5.5, maxLines: 2 });
      drawHeaderBox(tblX + 100, colY + 6, 20, 10, t3 ? `Tarea ${num3}:\n${t3.nombre || '-'}` : `Tarea ${num3}:\n-`, { fontSize: 5.5, maxLines: 2 });

      // Col 3: Tiempo Total (30mm)
      drawHeaderBox(tblX + 120, colY, 30, 16, 'Tiempo Total\nde exposición al\nfactor de riesgo', { fontSize: 6, maxLines: 3 });

      // Col 4: Nivel de Riesgo (30mm total: 10mm each)
      drawHeaderBox(tblX + 150, colY, 30, 6, 'Nivel de riesgo', { fontSize: 6.5 });
      drawHeaderBox(tblX + 150, colY + 6, 10, 10, `Tarea\n${num1}`, { fontSize: 5.5 });
      drawHeaderBox(tblX + 160, colY + 6, 10, 10, `Tarea\n${num2}`, { fontSize: 5.5 });
      drawHeaderBox(tblX + 170, colY + 6, 10, 10, `Tarea\n${num3}`, { fontSize: 5.5 });

      const rowStartY = colY + 16;
      const rowH = 7.5;

      const factorsDef = [
        { key: 'levantamiento', code: 'A', label: 'Levantamiento y descenso' },
        { key: 'empuje_arrastre', code: 'B', label: 'Empuje / Arrastre' },
        { key: 'transporte', code: 'C', label: 'Transporte' },
        { key: 'bipedestacion', code: 'D', label: 'Bipedestación' },
        { key: 'mov_repetitivos', code: 'E', label: 'Movimientos Repetitivos de MMSS' },
        { key: 'posturas_forzadas', code: 'F', label: 'Posturas Forzadas' },
        { key: 'vibraciones_mano_brazo', code: 'G', label: 'Vibraciones' },
        { key: 'confort_termico', code: 'H', label: 'Confort Térmico' },
        { key: 'estres_contacto', code: 'I', label: 'Estrés de Contacto' }
      ];

      setDrawColor(doc, COLOR_NEGRO);
      doc.setLineWidth(0.25);

      factorsDef.forEach((f, rIdx) => {
        const rowY = rowStartY + (rIdx * rowH);

        // Col Code (8mm)
        doc.rect(tblX, rowY, 8, rowH, 'S');
        drawCellText(doc, f.code, tblX, rowY, 8, rowH, { align: 'center', fontStyle: 'bold', fontSize: 7 });

        // Col Factor label (52mm)
        doc.rect(tblX + 8, rowY, 52, rowH, 'S');
        drawCellText(doc, f.label, tblX + 9, rowY, 50, rowH, { align: 'center', fontSize: 6.5, maxLines: 2 });

        // Col 2: Presence check (X or -)
        const hasT1 = t1 && t1[`f_${f.key}_identificado`] === 'si';
        const hasT2 = t2 && t2[`f_${f.key}_identificado`] === 'si';
        const hasT3 = t3 && t3[`f_${f.key}_identificado`] === 'si';

        doc.rect(tblX + 60, rowY, 20, rowH, 'S');
        drawCellText(doc, t1 ? (hasT1 ? 'X' : '-') : '-', tblX + 60, rowY, 20, rowH, { align: 'center', fontSize: 7.5 });

        doc.rect(tblX + 80, rowY, 20, rowH, 'S');
        drawCellText(doc, t2 ? (hasT2 ? 'X' : '-') : '-', tblX + 80, rowY, 20, rowH, { align: 'center', fontSize: 7.5 });

        doc.rect(tblX + 100, rowY, 20, rowH, 'S');
        drawCellText(doc, t3 ? (hasT3 ? 'X' : '-') : '-', tblX + 100, rowY, 20, rowH, { align: 'center', fontSize: 7.5 });

        // Col 3: Exposure time (Summed across tasks)
        const expTime = sumExposureTimes(tList, f.key);
        doc.rect(tblX + 120, rowY, 30, rowH, 'S');
        drawCellText(doc, expTime, tblX + 120, rowY, 30, rowH, { align: 'center', fontSize: 6.5, maxLines: 2 });

        // Col 4: Risk levels (1, 2, 3 or -)
        const rskT1 = t1 && hasT1 ? (t1[`f_${f.key}_riesgo`] || '-') : '-';
        const rskT2 = t2 && hasT2 ? (t2[`f_${f.key}_riesgo`] || '-') : '-';
        const rskT3 = t3 && hasT3 ? (t3[`f_${f.key}_riesgo`] || '-') : '-';

        doc.rect(tblX + 150, rowY, 10, rowH, 'S');
        drawCellText(doc, t1 ? String(rskT1) : '-', tblX + 150, rowY, 10, rowH, { align: 'center', fontSize: 7.5 });

        doc.rect(tblX + 160, rowY, 10, rowH, 'S');
        drawCellText(doc, t2 ? String(rskT2) : '-', tblX + 160, rowY, 10, rowH, { align: 'center', fontSize: 7.5 });

        doc.rect(tblX + 170, rowY, 10, rowH, 'S');
        drawCellText(doc, t3 ? String(rskT3) : '-', tblX + 170, rowY, 10, rowH, { align: 'center', fontSize: 7.5 });
      });

      let botY = rowStartY + (factorsDef.length * rowH) + 4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      setTextColor(doc, COLOR_NEGRO);
      doc.text('S/E Sin Evaluar', 15, botY);
      botY += 4;

      const noteLines = doc.splitTextToSize('Si alguno de los factores de riesgo se encuentra presente, continuar con la Evaluación Inicial de Factores de Riesgo que se identifican, completando la planilla 2', 180);
      doc.text(noteLines, 15, botY);

      // Signatures
      drawTripleSignatureBlock(248);
      drawFooter(pageCounter, totalPagesCount);
    });

    // ==========================================
    // HOJAS 6+: PLANILLA 2 POR FACTOR Y TAREA (A4 Vertical)
    // ==========================================
    tList.forEach((t, tIdx) => {
      factorsDef.forEach(f => {
        if (t[`f_${f.key}_identificado`] === 'si') {
          const qDef = CUESTIONARIOS_PLANILLA2[f.key];
          if (!qDef) return;

          doc.addPage('a4', 'portrait');
          pageCounter++;

          drawHeaderLogo();

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          setTextColor(doc, COLOR_NEGRO);
          doc.text('ANEXO I- PLANILLA 2: EVALUACION INICIAL DE FACTORES DE RIESGO', 15, 28);
          doc.setFontSize(9);
          doc.text(qDef.title, 15, 34);
          setDrawColor(doc, COLOR_SLATE_300);
          doc.setLineWidth(0.25);
          doc.line(15, 36, 195, 36);

          let p2Y = 44;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          setTextColor(doc, COLOR_NEGRO);
          doc.text(`Tarea ${tIdx + 1}`, 15, p2Y);
          p2Y += 6;

          // Paso 1
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.text('Paso 1: Identificar si la tarea del puesto de trabajo implica:', 15, p2Y);
          p2Y += 4;

          // Table Paso 1 Headers using drawHeaderBox
          const p1X = 15;
          const pH = 5;

          drawHeaderBox(p1X, p2Y, 12, pH, 'N°', { fontSize: 7 });
          drawHeaderBox(p1X + 12, p2Y, 143, pH, 'DESCRIPCION', { fontSize: 7 });
          drawHeaderBox(p1X + 155, p2Y, 25, pH, 'SI / NO', { fontSize: 7 });

          p2Y += pH;

          const respObj = t[`f_${f.key}_respuestas`] || {};

          setDrawColor(doc, COLOR_NEGRO);
          doc.setLineWidth(0.25);

          qDef.paso1.forEach((q, qIdx) => {
            const cleanQText = q.text.replace(/≥/g, '>=').replace(/≤/g, '<=');
            const qLines = doc.splitTextToSize(cleanQText, 139);
            const rH = Math.max(5, (qLines.length * 3.5) + 2);

            doc.rect(p1X, p2Y, 12, rH, 'S');
            drawCellText(doc, String(qIdx + 1), p1X, p2Y, 12, rH, { align: 'center', fontSize: 7 });

            doc.rect(p1X + 12, p2Y, 143, rH, 'S');
            drawCellText(doc, cleanQText, p1X + 14, p2Y, 139, rH, { align: 'left', fontSize: 6.5 });

            const ans = (respObj[q.id] || 'no').toUpperCase();
            doc.rect(p1X + 155, p2Y, 25, rH, 'S');
            drawCellText(doc, ans, p1X + 155, p2Y, 25, rH, { align: 'center', fontSize: 7, fontStyle: 'bold' });

            p2Y += rH;
          });

          p2Y += 3;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.text('Si todas las respuestas son NO, se considera que el riesgo es tolerable', 15, p2Y);
          p2Y += 3.8;
          doc.text('Si alguna respuesta 1 a 3 es SI, continuar con el paso 2', 15, p2Y);
          p2Y += 3.8;
          doc.text('Si la respuesta 3 es SI considera que el riesgo de la tarea es NO tolerable, debiendo solicitarse mejoras en tiempo prudencial', 15, p2Y);
          p2Y += 6;

          // Paso 2
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.text('Paso 2: Determinar el nivel de riesgo', 15, p2Y);
          p2Y += 4;

          drawHeaderBox(p1X, p2Y, 12, pH, 'N°', { fontSize: 7 });
          drawHeaderBox(p1X + 12, p2Y, 143, pH, 'DESCRIPCION', { fontSize: 7 });
          drawHeaderBox(p1X + 155, p2Y, 25, pH, 'SI / NO', { fontSize: 7 });

          p2Y += pH;

          setDrawColor(doc, COLOR_NEGRO);
          doc.setLineWidth(0.25);

          qDef.paso2.forEach((q, qIdx) => {
            const cleanQText = q.text.replace(/≥/g, '>=').replace(/≤/g, '<=');
            const qLines = doc.splitTextToSize(cleanQText, 139);
            const rH = Math.max(5, (qLines.length * 3.5) + 2);

            doc.rect(p1X, p2Y, 12, rH, 'S');
            drawCellText(doc, String(qIdx + 1), p1X, p2Y, 12, rH, { align: 'center', fontSize: 7 });

            doc.rect(p1X + 12, p2Y, 143, rH, 'S');
            drawCellText(doc, cleanQText, p1X + 14, p2Y, 139, rH, { align: 'left', fontSize: 6.5 });

            const ans = (respObj[q.id] || 'no').toUpperCase();
            doc.rect(p1X + 155, p2Y, 25, rH, 'S');
            drawCellText(doc, ans, p1X + 155, p2Y, 25, rH, { align: 'center', fontSize: 7, fontStyle: 'bold' });

            p2Y += rH;
          });

          p2Y += 3;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.text('Si todas las respuestas son NO se presume que el nivel de riesgo es tolerable', 15, p2Y);
          p2Y += 3.8;
          doc.text('Si alguna respuesta es SI, el empleador no puede presumir que el riesgo sea tolerable. Por lo tanto, se debe realizar una Evaluación de Riesgos.', 15, p2Y);

          // Escala de Borg para factor 2.E (Movimientos Repetitivos de Miembros Superiores)
          if (f.key === 'mov_repetitivos') {
            p2Y += 5;
            const borgX = 15;
            const borgRows = [
              { text: '•  Ausencia de esfuerzo', val: '0' },
              { text: '•  Esfuerzo muy bajo, apenas perceptible', val: '0,5' },
              { text: '•  Esfuerzo muy débil', val: '1' },
              { text: '•  Esfuerzo débil / ligero', val: '2' },
              { text: '•  Esfuerzo moderado / regular', val: '3' },
              { text: '•  Esfuerzo algo fuerte', val: '4' },
              { text: '•  Esfuerzo fuerte', val: '5 y 6' },
              { text: '•  Esfuerzo muy fuerte', val: '7, 8 y 9' },
              { text: '•  Esfuerzo extremadamente fuerte (máximo que una persona puede aguantar)', val: '10' }
            ];

            const rH = 4.2;
            const totalBorgH = borgRows.length * rH;

            // Col 1: Escala de Borg (Columna unificada con fondo gris)
            setFillColor(doc, COLOR_SLATE_200);
            setDrawColor(doc, COLOR_NEGRO);
            doc.setLineWidth(0.25);
            doc.rect(borgX, p2Y, 38, totalBorgH, 'FD');
            drawCellText(doc, 'Escala de Borg', borgX, p2Y, 38, totalBorgH, {
              align: 'center',
              valign: 'middle',
              fontSize: 8,
              fontStyle: 'bold',
              color: COLOR_NEGRO
            });

            // Col 2 y 3: Descripciones y Valores
            borgRows.forEach((bRow, bIdx) => {
              const rowY = p2Y + (bIdx * rH);

              // Col 2: Descripción
              doc.rect(borgX + 38, rowY, 122, rH, 'S');
              drawCellText(doc, bRow.text, borgX + 41, rowY, 118, rH, {
                align: 'left',
                valign: 'middle',
                fontSize: 6.5,
                fontStyle: 'normal'
              });

              // Col 3: Valor
              doc.rect(borgX + 160, rowY, 20, rH, 'S');
              drawCellText(doc, bRow.val, borgX + 160, rowY, 20, rH, {
                align: 'center',
                valign: 'middle',
                fontSize: 7,
                fontStyle: 'bold'
              });
            });

            p2Y += totalBorgH + 4;
          }

          // Curva de Confort de Fanger para factor 2.H (Confort Térmico)
          if (f.key === 'confort_termico') {
            p2Y += 4;
            const chartW = 95;
            const chartH = 68;
            const chartX = 15 + (180 - chartW) / 2; // 57.5mm (centrado)

            try {
              doc.addImage(FANGER_CHART_BASE64, 'PNG', chartX, p2Y, chartW, chartH, undefined, 'FAST');
              setDrawColor(doc, COLOR_SLATE_300);
              doc.setLineWidth(0.25);
              doc.rect(chartX, p2Y, chartW, chartH, 'S');
            } catch (err) {
              console.warn('Warning adding Fanger Comfort Chart:', err);
            }

            p2Y += chartH + 4;
          }

          drawTripleSignatureBlock(248);
          drawFooter(pageCounter, totalPagesCount);
        }
      });
    });

    // ==========================================
    // HOJAS 36+: PLANILLA 3 POR TAREA (A4 Vertical)
    // ==========================================
    tList.forEach((t, tIdx) => {
      doc.addPage('a4', 'portrait');
      pageCounter++;

      drawHeaderLogo();

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      setTextColor(doc, COLOR_NEGRO);
      doc.text('ANEXO I- PLANILLA 3: IDENTIFICACION DE MEDIDAS CORRECTIVAS Y PREVENTIVAS', 15, 28);
      doc.setFontSize(9);
      doc.text(`Tarea ${tIdx + 1}: ${t.nombre || `Tarea habitual ${tIdx + 1}`}`, 15, 34);
      setDrawColor(doc, COLOR_SLATE_300);
      doc.setLineWidth(0.25);
      doc.line(15, 36, 195, 36);

      let p3Y = 42;
      const p3X = 15;
      const pH = 5;

      // Table Title Box
      drawHeaderBox(p3X, p3Y, 180, pH, 'Medidas Correctivas y Preventivas (M.C.P.)', { fontSize: 7.5 });

      p3Y += pH;

      // Header row Generales
      drawHeaderBox(p3X, p3Y, 8, pH, 'Nº', { fontSize: 6 });
      drawHeaderBox(p3X + 8, p3Y, 92, pH, 'Medidas Preventivas Generales', { fontSize: 6 });
      drawHeaderBox(p3X + 100, p3Y, 25, pH, 'Fecha:', { fontSize: 6 });
      drawHeaderBox(p3X + 125, p3Y, 15, pH, 'SI / NO', { fontSize: 6 });
      drawHeaderBox(p3X + 140, p3Y, 40, pH, 'Observaciones', { fontSize: 6 });

      p3Y += pH;

      const genRows = Array.isArray(t.p3_medidas_generales) && t.p3_medidas_generales.length === 3
        ? t.p3_medidas_generales
        : [
            { num: 1, medida: 'Se ha informado al trabajador/es, supervisores, ingenieros, directivos relacionados con el puesto de trabajo, sobre el riesgo que tiene la tarea de desarrollar TME', fecha: '', aplica: 'si', observaciones: '-' },
            { num: 2, medida: 'Se ha capacitado al trabajador/es y supervisor/es relacionados con el puesto de trabajo, sobre la identificación de síntomas relacionados con el desarrollo de TME', fecha: '', aplica: 'si', observaciones: '-' },
            { num: 3, medida: 'Se ha capacitado al trabajador/es y supervisor/es relacionados con el puesto de trabajo, sobre las medidas y/o procedimientos para prevenir el desarrollo de TME', fecha: '', aplica: 'si', observaciones: '-' }
          ];

      setDrawColor(doc, COLOR_NEGRO);
      doc.setLineWidth(0.25);

      genRows.forEach((g) => {
        const rLines = doc.splitTextToSize(g.medida, 90);
        const rH = Math.max(5, (rLines.length * 3.2) + 2);

        doc.rect(p3X, p3Y, 8, rH, 'S');
        drawCellText(doc, String(g.num), p3X, p3Y, 8, rH, { align: 'center', fontSize: 6.5, fontStyle: 'bold' });

        doc.rect(p3X + 8, p3Y, 92, rH, 'S');
        drawCellText(doc, g.medida, p3X + 10, p3Y, 88, rH, { align: 'left', fontSize: 5.5 });

        doc.rect(p3X + 100, p3Y, 25, rH, 'S');
        drawCellText(doc, g.fecha || '-', p3X + 100, p3Y, 25, rH, { align: 'center', fontSize: 6 });

        doc.rect(p3X + 125, p3Y, 15, rH, 'S');
        drawCellText(doc, (g.aplica || 'si').toUpperCase(), p3X + 125, p3Y, 15, rH, { align: 'center', fontSize: 6.5, fontStyle: 'bold' });

        doc.rect(p3X + 140, p3Y, 40, rH, 'S');
        drawCellText(doc, g.observaciones || '-', p3X + 142, p3Y, 36, rH, { align: 'left', fontSize: 5.5 });

        p3Y += rH;
      });

      // Header row Específicas
      drawHeaderBox(p3X, p3Y, 8, pH, 'Nº', { fontSize: 6 });
      drawHeaderBox(p3X + 8, p3Y, 132, pH, 'Medidas Correctivas y Preventivas Especificas (Administrativas y de Ingeniería)', { fontSize: 6 });
      drawHeaderBox(p3X + 140, p3Y, 40, pH, 'Observaciones', { fontSize: 6 });

      p3Y += pH;

      const defaultEsp1 = 'Realizar evaluación de los factores de riesgo ergonómico del puesto de trabajo (Levantamiento y descenso, Transporte y posturas forzadas)';
      const espRows = Array.isArray(t.p3_medidas_especificas) && t.p3_medidas_especificas.length === 15
        ? t.p3_medidas_especificas
        : Array.from({ length: 15 }, (_, i) => ({
            num: i + 1,
            medida: i === 0 ? defaultEsp1 : '',
            observaciones: i === 0 ? '-' : ''
          }));

      setDrawColor(doc, COLOR_NEGRO);
      doc.setLineWidth(0.25);

      espRows.forEach((m) => {
        const rH = 4.2;
        doc.rect(p3X, p3Y, 8, rH, 'S');
        drawCellText(doc, String(m.num), p3X, p3Y, 8, rH, { align: 'center', fontSize: 6, fontStyle: 'bold' });

        doc.rect(p3X + 8, p3Y, 132, rH, 'S');
        drawCellText(doc, m.medida || '', p3X + 10, p3Y, 128, rH, { align: 'left', fontSize: 5.5 });

        doc.rect(p3X + 140, p3Y, 40, rH, 'S');
        drawCellText(doc, m.observaciones || '', p3X + 142, p3Y, 36, rH, { align: 'left', fontSize: 5.5 });

        p3Y += rH;
      });

      drawTripleSignatureBlock(248);
      drawFooter(pageCounter, totalPagesCount);
    });

    // ==========================================
    // HOJA 39: PLANILLA 4 POR PUESTO (A4 Vertical)
    // ==========================================
    doc.addPage('a4', 'portrait');
    pageCounter++;

    drawHeaderLogo();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    setTextColor(doc, COLOR_NEGRO);
    doc.text('ANEXO I- PLANILLA 4: MATRIZ DE SEGUIMIENTO MEDIDAS CORRECTIVAS Y PREVENTIVAS', 15, 28);
    setDrawColor(doc, COLOR_SLATE_300);
    doc.setLineWidth(0.25);
    doc.line(15, 35, 195, 35);

    let p4Y = 42;
    const p4X = 15;
    const hH = 9;

    drawHeaderBox(p4X, p4Y, 12, hH, 'Nº\nM.C.P.', { fontSize: 5.5 });
    drawHeaderBox(p4X + 12, p4Y, 53, hH, 'Nombre del Puesto', { fontSize: 6.5 });
    drawHeaderBox(p4X + 65, p4Y, 22, hH, 'Fecha de\nEvaluación', { fontSize: 6 });
    drawHeaderBox(p4X + 87, p4Y, 18, hH, 'Nivel de\nriesgo', { fontSize: 6 });
    drawHeaderBox(p4X + 105, p4Y, 25, hH, 'Fecha impl.\nmedida Admin.', { fontSize: 5.5 });
    drawHeaderBox(p4X + 130, p4Y, 25, hH, 'Fecha impl.\nmedida Ing.', { fontSize: 5.5 });
    drawHeaderBox(p4X + 155, p4Y, 25, hH, 'Fecha de\nCierre', { fontSize: 6 });

    p4Y += hH;
    const defaultP4Rows = [
      { num: 1, mcp: '', puesto_nombre: pt.puesto_text || '', fecha_evaluacion: formatDate(proto.fecha_medicion), nivel_riesgo: '', fecha_impl_admin: '', fecha_impl_ing: '', fecha_cierre: '' },
      { num: 2, mcp: '', puesto_nombre: pt.puesto_text || '', fecha_evaluacion: formatDate(proto.fecha_medicion), nivel_riesgo: '', fecha_impl_admin: '', fecha_impl_ing: '', fecha_cierre: '' },
      { num: 3, mcp: '', puesto_nombre: pt.puesto_text || '', fecha_evaluacion: formatDate(proto.fecha_medicion), nivel_riesgo: '', fecha_impl_admin: '', fecha_impl_ing: '', fecha_cierre: '' },
      { num: 4, mcp: '', puesto_nombre: pt.puesto_text || '', fecha_evaluacion: formatDate(proto.fecha_medicion), nivel_riesgo: '', fecha_impl_admin: '', fecha_impl_ing: '', fecha_cierre: '' },
      { num: 5, mcp: '', puesto_nombre: pt.puesto_text || '', fecha_evaluacion: formatDate(proto.fecha_medicion), nivel_riesgo: '', fecha_impl_admin: '', fecha_impl_ing: '', fecha_cierre: '' },
      { num: 6, mcp: '', puesto_nombre: pt.puesto_text || '', fecha_evaluacion: formatDate(proto.fecha_medicion), nivel_riesgo: '', fecha_impl_admin: '', fecha_impl_ing: '', fecha_cierre: '' },
      { num: 7, mcp: '', puesto_nombre: pt.puesto_text || '', fecha_evaluacion: formatDate(proto.fecha_medicion), nivel_riesgo: '', fecha_impl_admin: '', fecha_impl_ing: '', fecha_cierre: '' },
      { num: 8, mcp: '', puesto_nombre: pt.puesto_text || '', fecha_evaluacion: formatDate(proto.fecha_medicion), nivel_riesgo: '', fecha_impl_admin: '', fecha_impl_ing: '', fecha_cierre: '' },
      { num: 9, mcp: '', puesto_nombre: pt.puesto_text || '', fecha_evaluacion: formatDate(proto.fecha_medicion), nivel_riesgo: '', fecha_impl_admin: '', fecha_impl_ing: '', fecha_cierre: '' },
      { num: 10, mcp: '', puesto_nombre: pt.puesto_text || '', fecha_evaluacion: formatDate(proto.fecha_medicion), nivel_riesgo: '', fecha_impl_admin: '', fecha_impl_ing: '', fecha_cierre: '' }
    ];

    const p4Rows = Array.isArray(pt.p4_medidas) && pt.p4_medidas.length >= 1
      ? pt.p4_medidas
      : defaultP4Rows;

    setDrawColor(doc, COLOR_NEGRO);
    doc.setLineWidth(0.25);

    p4Rows.forEach((m, mIdx) => {
      const rowH = 7;
      doc.rect(p4X, p4Y, 12, rowH, 'S');
      drawCellText(doc, String(m.num || mIdx + 1), p4X, p4Y, 12, rowH, { align: 'center', fontSize: 6.5, fontStyle: 'bold' });

      doc.rect(p4X + 12, p4Y, 53, rowH, 'S');
      drawCellText(doc, m.mcp || m.puesto_nombre || '', p4X + 13, p4Y, 51, rowH, { align: 'left', fontSize: 5.5, maxLines: 2 });

      doc.rect(p4X + 65, p4Y, 22, rowH, 'S');
      drawCellText(doc, m.fecha_evaluacion || '-', p4X + 65, p4Y, 22, rowH, { align: 'center', fontSize: 6 });

      doc.rect(p4X + 87, p4Y, 18, rowH, 'S');
      drawCellText(doc, m.nivel_riesgo || '-', p4X + 87, p4Y, 18, rowH, { align: 'center', fontSize: 6, fontStyle: 'bold' });

      doc.rect(p4X + 105, p4Y, 25, rowH, 'S');
      drawCellText(doc, m.fecha_impl_admin || '-', p4X + 105, p4Y, 25, rowH, { align: 'center', fontSize: 6 });

      doc.rect(p4X + 130, p4Y, 25, rowH, 'S');
      drawCellText(doc, m.fecha_impl_ing || '-', p4X + 130, p4Y, 25, rowH, { align: 'center', fontSize: 6 });

      doc.rect(p4X + 155, p4Y, 25, rowH, 'S');
      drawCellText(doc, m.fecha_cierre || '-', p4X + 155, p4Y, 25, rowH, { align: 'center', fontSize: 6 });

      p4Y += rowH;
    });

    drawTripleSignatureBlock(248);
    drawFooter(pageCounter, totalPagesCount);
  });

  return doc;
};

export const generateErgonomyProtocolPdf = generateProtocoloErgonomiaPdf;
