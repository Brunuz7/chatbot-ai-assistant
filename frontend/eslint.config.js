import js from '@eslint/js';
import globals from 'globals';
import { defineConfig, globalIgnores } from 'eslint/config';

/** ESLint só em `eslint.config.js`. Código TS/React: `npm run typecheck`. */
export default defineConfig([
  globalIgnores(['dist', 'src/**', 'vite.config.ts']),
  {
    files: ['eslint.config.js'],
    languageOptions: {
      globals: globals.node,
    },
    rules: js.configs.recommended.rules,
  },
]);
