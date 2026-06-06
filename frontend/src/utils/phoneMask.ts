/** Brasil: 55 + DDD (2) + celular (9) = 13 dígitos. Fixo: 12 dígitos (55 + DDD + 8). */
export const DEFAULT_PHONE_COUNTRY_CODE = '55';

/** Valor inicial do campo (só código do país). */
export const DEFAULT_PHONE_INPUT_VALUE = DEFAULT_PHONE_COUNTRY_CODE;

const BR = DEFAULT_PHONE_COUNTRY_CODE;
const MAX_DIGITS_E164 = 15;
const MAX_DIGITS_MOBILE = 13;
const MAX_DIGITS_LANDLINE = 12;

/** Apenas dígitos, limitado ao tamanho E.164. */
export function digitsOnlyPhone(value: string): string {
  return value.replace(/\D/g, '').slice(0, MAX_DIGITS_E164);
}

function capBrPhoneDigits(d: string): string {
  if (!d.startsWith(BR)) return d.slice(0, MAX_DIGITS_E164);
  if (d.length <= MAX_DIGITS_LANDLINE) return d;
  return d.slice(0, MAX_DIGITS_MOBILE);
}

function looksLikeLocalBr(d: string): boolean {
  return (d.length === 10 || d.length === 11) && !d.startsWith('1');
}

/** Normaliza dígitos digitados/colados; não força 55 se o utilizador escolheu outro país. */
export function parsePhoneInput(raw: string): string {
  const d = digitsOnlyPhone(raw);
  if (!d) return '';
  if (d.startsWith(BR)) return capBrPhoneDigits(d);
  if (looksLikeLocalBr(d)) return capBrPhoneDigits(`${BR}${d}`);
  return d;
}

/** Dígitos normalizados para API; só código do país (55) conta como vazio. */
export function normalizePhoneDigits(digits: string): string {
  const d = digitsOnlyPhone(digits);
  if (!d || d === BR) return '';
  if (d.startsWith(BR)) return capBrPhoneDigits(d);
  if (looksLikeLocalBr(d)) return capBrPhoneDigits(`${BR}${d}`);
  return d;
}

function formatInternationalBr(d: string): string {
  const capped = capBrPhoneDigits(d);
  if (capped.length <= 2) return `+${capped}`;
  let out = `+${capped.slice(0, 2)}`;
  const rest = capped.slice(2);
  if (!rest.length) return out;
  if (rest.length <= 2) return `${out} (${rest}`;
  const ddd = rest.slice(0, 2);
  const num = rest.slice(2);
  if (!num.length) return `${out} (${ddd}`;
  if (num.length <= 4) return `${out} (${ddd}) ${num}`;
  if (num.length <= 8) return `${out} (${ddd}) ${num.slice(0, 4)}-${num.slice(4)}`;
  return `${out} (${ddd}) ${num.slice(0, 5)}-${num.slice(5, 9)}`;
}

function formatGenericInternational(d: string): string {
  const ccLen = d.startsWith('1') ? 1 : 2;
  const cc = d.slice(0, ccLen);
  const rest = d.slice(ccLen);
  let out = `+${cc}`;
  if (!rest) return out;
  if (rest.length <= 3) return `${out} ${rest}`;
  if (rest.length <= 6) return `${out} ${rest.slice(0, 3)} ${rest.slice(3)}`;
  return `${out} ${rest.slice(0, 3)} ${rest.slice(3, 6)}-${rest.slice(6)}`;
}

/** Máscara visual: +55 (75) 98333-1375 ou +1 555 123-4567 */
export function formatPhoneMask(digits: string): string {
  const d = digitsOnlyPhone(digits);
  if (!d || d === BR) return `+${BR}`;
  if (d.startsWith(BR)) return formatInternationalBr(d);
  return formatGenericInternational(d);
}

/** Valor ao carregar número salvo (sem país ou com 55). */
export function phoneInputDigitsFromStored(stored: string): string {
  const d = digitsOnlyPhone(stored);
  if (!d) return DEFAULT_PHONE_INPUT_VALUE;
  if (looksLikeLocalBr(d)) return capBrPhoneDigits(`${BR}${d}`);
  return d;
}
