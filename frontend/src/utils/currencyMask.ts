/** Máscara BRL: dígitos = centavos (ex.: "4990" → "49,90"). */
const MAX_CURRENCY_DIGITS = 9;

export function digitsOnlyCurrency(value: string): string {
  return value.replace(/\D/g, '').slice(0, MAX_CURRENCY_DIGITS);
}

export function parseCurrencyInput(raw: string): string {
  return digitsOnlyCurrency(raw);
}

export function formatCurrencyMask(digits: string): string {
  const d = digitsOnlyCurrency(digits);
  if (!d) return '';
  const cents = d.padStart(3, '0');
  const intPart = cents.slice(0, -2).replace(/^0+(?=\d)/, '') || '0';
  const decPart = cents.slice(-2);
  return `${intPart},${decPart}`;
}

export function currencyDigitsToNumber(digits: string): number {
  const d = digitsOnlyCurrency(digits);
  if (!d) return NaN;
  return Number(d) / 100;
}

export function numberToCurrencyDigits(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '';
  return String(Math.round(value * 100));
}

export function isValidCurrencyDigits(digits: string): boolean {
  const d = digitsOnlyCurrency(digits);
  return d.length > 0 && Number.isFinite(currencyDigitsToNumber(d));
}
