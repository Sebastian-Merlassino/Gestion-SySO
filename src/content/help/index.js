// src/content/help/index.js
import { dashboardHelp } from './articles/dashboard';
import { empresasHelp } from './articles/empresas';
import { correctivasHelp } from './articles/correctivas';
import { accidentesHelp } from './articles/accidentes';
import { visitasHelp } from './articles/visitas';
import { matrizRiesgosHelp } from './articles/matrizRiesgos';
import { extintoresHelp } from './articles/extintores';
import { controlElectricoHelp } from './articles/controlElectrico';
import { avisosHelp } from './articles/avisos';
import { checklistPersonalizadosHelp } from './articles/checklistPersonalizados';
import { programaHelp } from './articles/programa';
import { capacitacionHelp } from './articles/capacitacion';
import { capacitacionesOnlineHelp } from './articles/capacitacionesOnline';
import { 
  protocoloIluminacionHelp, 
  protocoloRuidoHelp, 
  protocoloErgonomiaHelp, 
  protocoloPuestaATierraHelp 
} from './articles/protocolos';
import { legajoHelp } from './articles/legajo';
import { nominaHelp } from './articles/nomina';
import { equipoHelp } from './articles/equipo';
import { profileHelp } from './articles/profile';
import { onboardingHelp } from './articles/onboarding';
import { loginHelp, registerHelp } from './articles/auth';
import { adminHelp } from './articles/admin';
import { facturacionHelp } from './articles/facturacion';

export const HELP_ARTICLES = {
  'dashboard': dashboardHelp,
  'empresas': empresasHelp,
  'empresas-listado': empresasHelp,
  'empresas-form': empresasHelp,
  'facturacion': facturacionHelp,
  'facturacion-listado': facturacionHelp,
  'facturacion-form': facturacionHelp,
  'correctivas': correctivasHelp,
  'accidentes': accidentesHelp,
  'visitas': visitasHelp,
  'matriz-riesgos': matrizRiesgosHelp,
  'extintores': extintoresHelp,
  'control-electrico': controlElectricoHelp,
  'avisos': avisosHelp,
  'checklist-personalizados': checklistPersonalizadosHelp,
  'programa': programaHelp,
  'capacitacion': capacitacionHelp,
  'capacitaciones-online': capacitacionesOnlineHelp,
  'protocolo-iluminacion': protocoloIluminacionHelp,
  'protocolo-iluminacion-listado': protocoloIluminacionHelp,
  'protocolo-iluminacion-form': protocoloIluminacionHelp,
  'protocolo-ruido': protocoloRuidoHelp,
  'protocolo-ruido-listado': protocoloRuidoHelp,
  'protocolo-ruido-form': protocoloRuidoHelp,
  'protocolo-ergonomia': protocoloErgonomiaHelp,
  'protocolo-ergonomia-listado': protocoloErgonomiaHelp,
  'protocolo-ergonomia-form': protocoloErgonomiaHelp,
  'protocolo-puesta-a-tierra': protocoloPuestaATierraHelp,
  'protocolo-pat': protocoloPuestaATierraHelp,
  'protocolo-pat-listado': protocoloPuestaATierraHelp,
  'protocolo-pat-form': protocoloPuestaATierraHelp,
  'legajo': legajoHelp,
  'nomina': nominaHelp,
  'equipo': equipoHelp,
  'profile': profileHelp,
  'onboarding': onboardingHelp,
  'login': loginHelp,
  'register': registerHelp,
  'admin': adminHelp,
};

export const ALL_ARTICLES_LIST = Object.values(HELP_ARTICLES).filter(
  (art, idx, arr) => arr.findIndex(a => a.key === art.key) === idx
);
