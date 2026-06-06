/** Regras ESLint compartilhadas — estilo compacto, alinhado ao Prettier do projeto. */
export const compactStyleRules = {
  curly: ['error', 'multi-or-nest'],
  'brace-style': ['error', '1tbs', { allowSingleLine: true }],
  'max-len': ['warn', { code: 120, ignoreUrls: true, ignoreStrings: true, ignoreTemplateLiterals: true }],
};

export const typescriptRelaxedRules = {
  '@typescript-eslint/no-explicit-any': 'off',
  '@typescript-eslint/no-empty-function': 'off',
  '@typescript-eslint/no-non-null-assertion': 'off',
  '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
};
