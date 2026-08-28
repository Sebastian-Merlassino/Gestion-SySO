// src/lib/arca/wsfe.js
// Native Web Service de Facturación Electrónica (WSFEv1) client for ARCA / AFIP
import xml2js from 'xml2js';
import { postSoap } from './soapClient.js';

const WSFE_URLS = {
  homologacion: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
  produccion: 'https://servicios1.afip.gov.ar/wsfev1/service.asmx',
};

const SOAP_ACTION_PREFIX = 'http://ar.gov.afip.dif.FEV1/';

export class WsfeClient {
  constructor({ cuit, token, sign, environment = 'produccion' }) {
    this.cuit = typeof cuit === 'number' ? cuit : parseInt(String(cuit).replace(/\D/g, ''), 10);
    this.token = token;
    this.sign = sign;
    this.environment = environment;
    this.url = WSFE_URLS[environment] || WSFE_URLS.produccion;
  }

  /**
   * Helper to execute a raw SOAP request against WSFEv1
   */
  async _soapCall(actionName, bodyXml) {
    const soapEnvelope =
      '<?xml version="1.0" encoding="utf-8"?>\n' +
      '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">\n' +
      '  <soap:Body>\n' +
      `    <${actionName} xmlns="http://ar.gov.afip.dif.FEV1/">\n` +
      `      ${bodyXml}\n` +
      `    </${actionName}>\n` +
      '  </soap:Body>\n' +
      '</soap:Envelope>';

    const soapAction = `"${SOAP_ACTION_PREFIX}${actionName}"`;
    const { parsed } = await postSoap(this.url, soapEnvelope, soapAction);

    const body =
      parsed?.['soap:Envelope']?.['soap:Body'] ||
      parsed?.['soapenv:Envelope']?.['soapenv:Body'] ||
      parsed?.['Envelope']?.['Body'];

    const result = body?.[`${actionName}Response`]?.[`${actionName}Result`];

    if (!result) {
      throw new Error(`Respuesta vacía o inválida de WSFE para ${actionName}`);
    }

    // Check for WSFE business errors array
    if (result.Errors) {
      const errList = Array.isArray(result.Errors.Err) ? result.Errors.Err : [result.Errors.Err].filter(Boolean);
      if (errList.length > 0) {
        const errorDescriptions = errList.map((e) => `[${e.Code || e.code}] ${e.Msg || e.msg}`).join('; ');
        const error = new Error(`ARCA Error: ${errorDescriptions}`);
        error.arcaErrors = errList;
        throw error;
      }
    }

    return result;
  }

  /**
   * Builds the <Auth> XML block
   */
  _authXml() {
    return (
      '<Auth>\n' +
      `  <Token>${this.token}</Token>\n` +
      `  <Sign>${this.sign}</Sign>\n` +
      `  <Cuit>${this.cuit}</Cuit>\n` +
      '</Auth>'
    );
  }

  /**
   * FEDummy: Tests connection with ARCA servers
   * @returns {Promise<{AppServer: string, DbServer: string, AuthServer: string}>}
   */
  async getServerStatus() {
    const result = await this._soapCall('FEDummy', '');
    return {
      AppServer: result.AppServer || 'OK',
      DbServer: result.DbServer || 'OK',
      AuthServer: result.AuthServer || 'OK',
    };
  }

  /**
   * FECompUltimoAutorizado: Gets the last voucher number issued for a point of sale and voucher type
   * @param {number} ptoVta
   * @param {number} cbteTipo
   * @returns {Promise<number>} The last voucher number (integer)
   */
  async getLastVoucher(ptoVta, cbteTipo) {
    const bodyXml = `
      ${this._authXml()}
      <PtoVta>${ptoVta}</PtoVta>
      <CbteTipo>${cbteTipo}</CbteTipo>
    `;

    const result = await this._soapCall('FECompUltimoAutorizado', bodyXml);
    return parseInt(result.CbteNro || '0', 10);
  }

  /**
   * FECAESolicitar: Requests CAE authorization for a voucher
   * @param {Object} voucher
   * @returns {Promise<{CAE: string, CAEFchVto: string, CbteDesde: number, CbteHasta: number, Resultado: string, Observaciones: Array}>}
   */
  async createVoucher(voucher) {
    // 1. Build optional IVA array XML
    let ivaXml = '';
    if (voucher.Iva && Array.isArray(voucher.Iva) && voucher.Iva.length > 0) {
      ivaXml = '<Iva>\n' +
        voucher.Iva.map((item) =>
          '  <AlicIva>\n' +
          `    <Id>${item.Id}</Id>\n` +
          `    <BaseImp>${item.BaseImp}</BaseImp>\n` +
          `    <Importe>${item.Importe}</Importe>\n` +
          '  </AlicIva>'
        ).join('\n') +
        '\n</Iva>';
    }

    // 2. Build optional Tributos array XML
    let tributosXml = '';
    if (voucher.Tributos && Array.isArray(voucher.Tributos) && voucher.Tributos.length > 0) {
      tributosXml = '<Tributos>\n' +
        voucher.Tributos.map((item) =>
          '  <Tributo>\n' +
          `    <Id>${item.Id}</Id>\n` +
          `    <Desc>${item.Desc || ''}</Desc>\n` +
          `    <BaseImp>${item.BaseImp || 0}</BaseImp>\n` +
          `    <Alic>${item.Alic || 0}</Alic>\n` +
          `    <Importe>${item.Importe}</Importe>\n` +
          '  </Tributo>'
        ).join('\n') +
        '\n</Tributos>';
    }

    // 3. Build optional CbtesAsoc XML
    let cbtesAsocXml = '';
    if (voucher.CbtesAsoc && Array.isArray(voucher.CbtesAsoc) && voucher.CbtesAsoc.length > 0) {
      cbtesAsocXml = '<CbtesAsoc>\n' +
        voucher.CbtesAsoc.map((item) =>
          '  <CbteAsoc>\n' +
          `    <Tipo>${item.Tipo}</Tipo>\n` +
          `    <PtoVta>${item.PtoVta}</PtoVta>\n` +
          `    <Nro>${item.Nro}</Nro>\n` +
          (item.Cuit ? `    <Cuit>${item.Cuit}</Cuit>\n` : '') +
          '  </CbteAsoc>'
        ).join('\n') +
        '\n</CbtesAsoc>';
    }

    // 4. Build optional Service Dates
    let serviceDatesXml = '';
    if (voucher.FchServDesde) {
      serviceDatesXml += `  <FchServDesde>${voucher.FchServDesde}</FchServDesde>\n`;
    }
    if (voucher.FchServHasta) {
      serviceDatesXml += `  <FchServHasta>${voucher.FchServHasta}</FchServHasta>\n`;
    }
    if (voucher.FchVtoPago) {
      serviceDatesXml += `  <FchVtoPago>${voucher.FchVtoPago}</FchVtoPago>\n`;
    }

    const bodyXml = `
      ${this._authXml()}
      <FeCAEReq>
        <FeCabReq>
          <CantReg>${voucher.CantReg || 1}</CantReg>
          <PtoVta>${voucher.PtoVta}</PtoVta>
          <CbteTipo>${voucher.CbteTipo}</CbteTipo>
        </FeCabReq>
        <FeDetReq>
          <FECAEDetRequest>
            <Concepto>${voucher.Concepto}</Concepto>
            <DocTipo>${voucher.DocTipo}</DocTipo>
            <DocNro>${voucher.DocNro}</DocNro>
            <CbteDesde>${voucher.CbteDesde}</CbteDesde>
            <CbteHasta>${voucher.CbteHasta}</CbteHasta>
            <CbteFch>${voucher.CbteFch}</CbteFch>
            <ImpTotal>${voucher.ImpTotal}</ImpTotal>
            <ImpTotConc>${voucher.ImpTotConc || 0}</ImpTotConc>
            <ImpNeto>${voucher.ImpNeto}</ImpNeto>
            <ImpOpEx>${voucher.ImpOpEx || 0}</ImpOpEx>
            <ImpTrib>${voucher.ImpTrib || 0}</ImpTrib>
            <ImpIVA>${voucher.ImpIVA || 0}</ImpIVA>
            ${serviceDatesXml}
            <MonId>${voucher.MonId || 'PES'}</MonId>
            <MonCotiz>${voucher.MonCotiz || 1}</MonCotiz>
            ${cbtesAsocXml}
            ${tributosXml}
            ${ivaXml}
          </FECAEDetRequest>
        </FeDetReq>
      </FeCAEReq>
    `;

    const result = await this._soapCall('FECAESolicitar', bodyXml);

    const cabResp = result.FeCabResp;
    const detResp = result.FeDetResp?.FECAEDetResponse;

    if (!detResp) {
      throw new Error('ARCA no devolvió el detalle de respuesta del comprobante.');
    }

    // Check if voucher was rejected
    if (detResp.Resultado === 'R') {
      let obsMsg = 'Comprobante rechazado por ARCA.';
      if (detResp.Observaciones) {
        const obsList = Array.isArray(detResp.Observaciones.Obs)
          ? detResp.Observaciones.Obs
          : [detResp.Observaciones.Obs].filter(Boolean);
        obsMsg = obsList.map((o) => `[${o.Code || o.code}] ${o.Msg || o.msg}`).join('; ');
      }
      const error = new Error(`ARCA Rechazo: ${obsMsg}`);
      error.arcaObservations = detResp.Observaciones;
      throw error;
    }

    return {
      CAE: detResp.CAE,
      CAEFchVto: detResp.CAEFchVto,
      CbteDesde: parseInt(detResp.CbteDesde || voucher.CbteDesde, 10),
      CbteHasta: parseInt(detResp.CbteHasta || voucher.CbteHasta, 10),
      Resultado: detResp.Resultado || cabResp?.Resultado,
      Observaciones: detResp.Observaciones || null,
      rawResponse: result,
    };
  }

  /**
   * FECompConsultar: Gets information for an issued voucher
   * @param {number} cbteNro
   * @param {number} ptoVta
   * @param {number} cbteTipo
   * @returns {Promise<Object>}
   */
  async getVoucherInfo(cbteNro, ptoVta, cbteTipo) {
    const bodyXml = `
      ${this._authXml()}
      <FeCompConsReq>
        <CbteTipo>${cbteTipo}</CbteTipo>
        <CbteNro>${cbteNro}</CbteNro>
        <PtoVta>${ptoVta}</PtoVta>
      </FeCompConsReq>
    `;

    const result = await this._soapCall('FECompConsultar', bodyXml);
    return result.ResultGet;
  }
}
