import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import perfectionist from 'eslint-plugin-perfectionist';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['dist', 'src/generated/prisma']),
  {
    extends: ['js/recommended'],
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    languageOptions: { globals: globals.node },
    plugins: { js },
  },
  tseslint.configs.recommended,
  stylistic.configs.recommended,
  {
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      '@stylistic/padding-line-between-statements': [
        'error',
        {
          blankLine: 'always',
          next: ['const', 'let', 'var', 'return', 'export'],
          prev: '*',
        },
      ],
    },
  },
  eslintPluginPrettierRecommended,
  perfectionist.configs['recommended-alphabetical'],
  {
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
]);
