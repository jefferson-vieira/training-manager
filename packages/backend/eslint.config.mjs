import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import perfectionist from 'eslint-plugin-perfectionist';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  {
    extends: ['js/recommended'],
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    languageOptions: { globals: globals.node },
    plugins: { js },
  },
  tseslint.configs.recommended,
  eslintConfigPrettier,
  stylistic.configs.customize({
    braceStyle: '1tbs',
    semi: true,
  }),
  {
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      '@stylistic/padding-line-between-statements': ['error', { blankLine: 'always', next: ['const', 'let', 'var', 'return'], prev: '*' }],
    },
  },
  perfectionist.configs['recommended-alphabetical'],
]);
