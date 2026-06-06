/** Segmentos de empresa mais comuns no cadastro (valor enviado à API = `id`). */
export const COMPANY_SEGMENTS = [
  { id: 'ecommerce', label: 'E-commerce' },
  { id: 'varejo_loja', label: 'Varejo / Loja física' },
  { id: 'restaurante_alimentacao', label: 'Restaurante / Alimentação' },
  { id: 'clinica_saude', label: 'Clínica / Saúde' },
  { id: 'beleza_estetica', label: 'Beleza / Estética / Salão' },
  { id: 'imobiliaria', label: 'Imobiliária' },
  { id: 'agencia_marketing', label: 'Agência / Marketing' },
  { id: 'educacao_cursos', label: 'Educação / Cursos' },
  { id: 'consultoria_servicos', label: 'Consultoria / Serviços' },
  { id: 'advocacia_contabilidade', label: 'Advocacia / Contabilidade' },
  { id: 'tecnologia_software', label: 'Tecnologia / Software' },
  { id: 'automotivo', label: 'Automotivo / Oficina' },
  { id: 'fitness_academia', label: 'Fitness / Academia' },
  { id: 'pet_veterinario', label: 'Pet shop / Veterinário' },
  { id: 'construcao_reformas', label: 'Construção / Reformas' },
  { id: 'logistica_transporte', label: 'Logística / Transporte' },
  { id: 'eventos', label: 'Eventos / Festas' },
  { id: 'outros', label: 'Outros' },
] as const;

export type CompanySegmentId = (typeof COMPANY_SEGMENTS)[number]['id'];

export function getCompanySegmentLabel(id: string | null | undefined): string | null {
  if (!id) return null;
  return COMPANY_SEGMENTS.find((s) => s.id === id)?.label ?? id;
}
