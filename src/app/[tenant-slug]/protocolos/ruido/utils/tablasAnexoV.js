// src/app/[tenant-slug]/protocolos/ruido/utils/tablasAnexoV.js
// Tabla 1 — Valores límite para ruido (Resolución MTEySS 295/2003 - ANEXO V)

export const TABLA_1_RUIDO = [
  {
    duracion: 24,
    unidad: "horas",
    nivel_presion_acustica_dba: 80,
    label: "24 horas — 80 dBA",
    horas_decimales: 24
  },
  {
    duracion: 16,
    unidad: "horas",
    nivel_presion_acustica_dba: 82,
    label: "16 horas — 82 dBA",
    horas_decimales: 16
  },
  {
    duracion: 8,
    unidad: "horas",
    nivel_presion_acustica_dba: 85,
    label: "8 horas — 85 dBA",
    horas_decimales: 8
  },
  {
    duracion: 4,
    unidad: "horas",
    nivel_presion_acustica_dba: 88,
    label: "4 horas — 88 dBA",
    horas_decimales: 4
  },
  {
    duracion: 2,
    unidad: "horas",
    nivel_presion_acustica_dba: 91,
    label: "2 horas — 91 dBA",
    horas_decimales: 2
  },
  {
    duracion: 1,
    unidad: "hora",
    nivel_presion_acustica_dba: 94,
    label: "1 hora — 94 dBA",
    horas_decimales: 1
  },
  {
    duracion: 30,
    unidad: "minutos",
    nivel_presion_acustica_dba: 97,
    label: "30 minutos — 97 dBA",
    horas_decimales: 0.5
  },
  {
    duracion: 15,
    unidad: "minutos",
    nivel_presion_acustica_dba: 100,
    label: "15 minutos — 100 dBA",
    horas_decimales: 0.25
  },
  {
    duracion: 7.5,
    unidad: "minutos",
    nivel_presion_acustica_dba: 103,
    label: "7,50 minutos — 103 dBA",
    horas_decimales: 0.125
  },
  {
    duracion: 3.75,
    unidad: "minutos",
    nivel_presion_acustica_dba: 106,
    label: "3,75 minutos — 106 dBA",
    horas_decimales: 0.0625
  },
  {
    duracion: 1.88,
    unidad: "minutos",
    nivel_presion_acustica_dba: 109,
    label: "1,88 minutos — 109 dBA",
    horas_decimales: 0.0313
  },
  {
    duracion: 0.94,
    unidad: "minutos",
    nivel_presion_acustica_dba: 112,
    label: "0,94 minutos — 112 dBA",
    horas_decimales: 0.0157
  },
  {
    duracion: 28.12,
    unidad: "segundos",
    nivel_presion_acustica_dba: 115,
    label: "28,12 segundos — 115 dBA",
    horas_decimales: 0.0078
  },
  {
    duracion: 14.06,
    unidad: "segundos",
    nivel_presion_acustica_dba: 118,
    label: "14,06 segundos — 118 dBA",
    horas_decimales: 0.0039
  },
  {
    duracion: 7.03,
    unidad: "segundos",
    nivel_presion_acustica_dba: 121,
    label: "7,03 segundos — 121 dBA",
    horas_decimales: 0.00195
  },
  {
    duracion: 3.52,
    unidad: "segundos",
    nivel_presion_acustica_dba: 124,
    label: "3,52 segundos — 124 dBA",
    horas_decimales: 0.00098
  },
  {
    duracion: 1.76,
    unidad: "segundos",
    nivel_presion_acustica_dba: 127,
    label: "1,76 segundos — 127 dBA",
    horas_decimales: 0.00049
  },
  {
    duracion: 0.88,
    unidad: "segundos",
    nivel_presion_acustica_dba: 130,
    label: "0,88 segundos — 130 dBA",
    horas_decimales: 0.00024
  },
  {
    duracion: 0.44,
    unidad: "segundos",
    nivel_presion_acustica_dba: 133,
    label: "0,44 segundos — 133 dBA",
    horas_decimales: 0.00012
  },
  {
    duracion: 0.22,
    unidad: "segundos",
    nivel_presion_acustica_dba: 136,
    label: "0,22 segundos — 136 dBA",
    horas_decimales: 0.00006
  },
  {
    duracion: 0.11,
    unidad: "segundos",
    nivel_presion_acustica_dba: 139,
    label: "0,11 segundos — 139 dBA",
    horas_decimales: 0.00003
  }
];

/**
 * Obtiene el límite normativo en dBA de la Tabla 1 (Res. 295/03 ANEXO V)
 * según el tiempo de exposición Te en horas.
 */
export function getLimiteDbaForTe(teHs) {
  const te = parseFloat(teHs);
  if (isNaN(te) || te <= 0) return 85;

  // Búsqueda exacta en el catálogo de la Tabla 1
  const match = TABLA_1_RUIDO.find(item => Math.abs(item.horas_decimales - te) < 0.001);
  if (match) {
    return match.nivel_presion_acustica_dba;
  }

  // Ecuación según Res. 295/03 ANEXO V (tasa de cambio de 3 dBA): L_limite = 85 + 3 * log2(8 / te)
  const limiteCalculado = 85 + (3 * Math.log2(8 / te));
  return Math.round(limiteCalculado * 10) / 10;
}

/**
 * Función central de evaluación técnica y cumplimiento normativo para un punto de muestreo de ruido.
 */
export function getPuntoCalculos(p) {
  if (!p) return { resultado_punto: 'Pendiente', valorMedidoText: '-', limiteLegalText: '-' };
  let resultado = 'Pendiente';
  let valorMedidoText = '-';
  let limiteLegalText = '-';

  if (p.caracteristicas_ruido === 'impulso_impacto') {
    const valPico = parseFloat(p.nivel_pico_lc_pico_dbc);
    limiteLegalText = '140 dBC (Techo)';
    if (!isNaN(valPico)) {
      valorMedidoText = `${valPico} dBC`;
      resultado = valPico <= 140 ? 'Cumple' : 'No cumple';
    }
  } else {
    // continuo_intermitente
    if (p.tipo_carga_continuo === 'laeq') {
      const valLaeq = parseFloat(p.nivel_laeq_te_dba);
      const teHs = parseFloat(p.tiempo_exposicion_hs);
      const limiteDba = getLimiteDbaForTe(teHs);
      const labelTe = (!isNaN(teHs) && teHs > 0) ? `${teHs} hs` : '8 hs';
      limiteLegalText = `${limiteDba} dBA (${labelTe})`;
      if (!isNaN(valLaeq)) {
        valorMedidoText = `${valLaeq} dBA`;
        resultado = valLaeq <= limiteDba ? 'Cumple' : 'No cumple';
      }
    } else if (p.tipo_carga_continuo === 'suma_fracciones') {
      const valSuma = parseFloat(p.resultado_suma_fracciones);
      limiteLegalText = '1.00';
      if (!isNaN(valSuma)) {
        valorMedidoText = `${valSuma}`;
        resultado = valSuma <= 1.0 ? 'Cumple' : 'No cumple';
      }
    } else if (p.tipo_carga_continuo === 'dosis') {
      const valDosis = parseFloat(p.dosis_porcentaje);
      limiteLegalText = '100 %';
      if (!isNaN(valDosis)) {
        valorMedidoText = `${valDosis} %`;
        resultado = valDosis <= 100 ? 'Cumple' : 'No cumple';
      }
    }
  }

  return {
    resultado_punto: resultado,
    valorMedidoText,
    limiteLegalText
  };
}
