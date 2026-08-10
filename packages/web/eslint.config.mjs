import stylistic from '@stylistic/eslint-plugin';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import perfectionist from 'eslint-plugin-perfectionist';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import eslintPluginZod from 'eslint-plugin-zod';
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
          prev: ['const', 'let', 'var', 'import'],
        },
        {
          blankLine: 'always',
          next: ['if', 'for', 'while', 'switch', 'try', 'return', 'export'],
          prev: '*',
        },
        {
          blankLine: 'any',
          next: ['import'],
          prev: ['import'],
        },
        {
          blankLine: 'any',
          next: ['export'],
          prev: ['export'],
        },
      ],
    },
  },
  eslintPluginPrettierRecommended,
  perfectionist.configs['recommended-natural'],
  {
    rules: {
      'no-useless-rename': 'error',
      'perfectionist/sort-jsx-props': [
        'error',
        {
          customGroups: [
            {
              elementNamePattern: '^key$',
              groupName: 'react',
            },
            {
              elementNamePattern: '^on.',
              groupName: 'callback',
            },
          ],
          groups: ['react', 'unknown', 'callback'],
        },
      ],
    },
  },
  eslintPluginZod.configs.recommended,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'src/lib/api/fetch-generated/index.ts',
    'src/lib/api/query-generated/index.ts',
  ]),
]);

export default eslintConfig;
