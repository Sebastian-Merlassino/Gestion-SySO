// src/lib/arca/arcaDates.js
// Universal date parsing and normalization for ARCA invoices and Excel bulk imports

/**
 * Normalizes any date representation (DD/MM/YYYY, D/M/AA, YYYY-MM-DD, YYYY MM DD, Excel serial number, Date)
 * into a standard ISO "YYYY-MM-DD" string.
 * If empty or invalid, falls back to fallbackDate (defaults to today).
 *
 * @param {any} val - Input date from Excel or user input
 * @param {Date} [fallbackDate] - Optional fallback Date object (defaults to current date)
 * @returns {string} "YYYY-MM-DD"
 */
export function normalizeDateToYMD(val, fallbackDate = new Date()) {
  const getFallback = () => {
    const d = fallbackDate instanceof Date && !isNaN(fallbackDate.getTime()) ? fallbackDate : new Date();
    return d.toISOString().split('T')[0];
  };

  if (val === null || val === undefined || val === '') {
    return getFallback();
  }

  // 1. If it's already a Date object
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().split('T')[0];
  }

  // 2. If it's an Excel serial date number (e.g. 45535 or 46235)
  if (typeof val === 'number') {
    if (val > 10000 && val < 100000) {
      // Excel epoch begins 1899-12-30 (25569 days before Unix epoch 1970-01-01)
      const utcMs = Math.round((val - 25569) * 86400 * 1000);
      const date = new Date(utcMs);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
  }

  const str = String(val).trim();
  if (!str) {
    return getFallback();
  }

  // 3. Match YYYY-MM-DD, YYYY/MM/DD, YYYY MM DD, YYYY.MM.DD
  const ymdMatch = str.match(/^(\d{4})[\s\/\-\.](\d{1,2})[\s\/\-\.](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 4. Match DD/MM/YYYY, D/M/YYYY, DD-MM-YYYY, DD MM YYYY, DD.MM.YYYY, DD/MM/YY, D/M/YY
  const dmyMatch = str.match(/^(\d{1,2})[\s\/\-\.](\d{1,2})[\s\/\-\.](\d{2,4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    let year = dmyMatch[3];
    if (year.length === 2) {
      const parsedYear = parseInt(year, 10);
      year = parsedYear < 50 ? `20${year}` : `19${year}`;
    }
    return `${year}-${month}-${day}`;
  }

  // 5. Native JS Date parse fallback
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return getFallback();
}

/**
 * Converts any date representation to an 8-digit integer for ARCA SOAP WSFE (e.g. 20260903)
 * @param {any} val - Input date
 * @param {Date} [fallbackDate] - Optional fallback Date object
 * @returns {number} YYYYMMDD as integer (e.g. 20260903)
 */
export function formatDateToArcaInteger(val, fallbackDate = new Date()) {
  const ymd = normalizeDateToYMD(val, fallbackDate);
  const clean = ymd.replace(/\D/g, '');
  const n = parseInt(clean, 10);
  if (isNaN(n) || n < 19000101 || n > 21001231) {
    const today = new Date().toISOString().split('T')[0].replace(/\D/g, '');
    return parseInt(today, 10);
  }
  return n;
}
