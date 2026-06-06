import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier/recommended';
import { defineConfig, globalIgnores } from 'eslint/config';
import { compactStyleRules, typescriptRelaxedRules } from '../eslint.shared.mjs';

export default defineConfig([
  globalIgnores(['dist', 'node_modules', 'prisma/seed.ts']),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
    rules: {
      ...compactStyleRules,
      ...typescriptRelaxedRules,
    },
  },
]);
