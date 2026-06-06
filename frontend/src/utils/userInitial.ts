/** Primeira letra para exibir no avatar (nome ou e-mail). */
export function userInitial(name?: string | null, email?: string | null): string {
  const fromName = name?.trim();
  if (fromName) return fromName.charAt(0).toUpperCase();

  const fromEmail = email?.trim();
  if (fromEmail) return fromEmail.charAt(0).toUpperCase();

  return '?';
}
