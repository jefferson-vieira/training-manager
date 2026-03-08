import stylistic from '@stylistic/eslint-plugin';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import perfectionist from 'eslint-plugin-perfectionist';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import { defineConfig, globalIgnores } from 'eslint/config';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
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
          next: '*',
          prev: ['const', 'let', 'var', 'directive', 'import'],
        },
        {
          blankLine: 'always',
          next: ['if', 'for', 'while', 'switch', 'try', 'return'],
          prev: '*',
        },
        {
          blankLine: 'any',
          next: ['const', 'let', 'var', 'import'],
          prev: ['const', 'let', 'var', 'import'],
        },
      ],
    },
  },
  eslintPluginPrettierRecommended,
  perfectionist.configs['recommended-alphabetical'],
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);

export default eslintConfig;
