const MAX_DIGITS = 15;

/** Apenas dígitos (formato enviado à API). */
export function digitsOnlyPhone(value: string): string {
  return value.replace(/\D/g, '').slice(0, MAX_DIGITS);
}

/** Máscara visual: +55 (11) 99999-9999 (adapta-se enquanto digita). */
export function formatPhoneMask(digits: string): string {
  const d = digitsOnlyPhone(digits);
  if (!d) return '';
  if (d.length <= 2) return `+${d}`;

  let out = `+${d.slice(0, 2)}`;
  if (d.length > 2) {
    out += ` (${d.slice(2, 4)}`;
    if (d.length > 4) {
      out += `) ${d.slice(4, 9)}`;
      if (d.length > 9) {
        out += `-${d.slice(9, 13)}`;
        if (d.length > 13) out += d.slice(13);
      }
    }
  }
  return out;
}
