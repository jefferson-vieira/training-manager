import path from 'node:path';

const buildEslintCommand = (filenames) =>
  `eslint --config packages/web/eslint.config.mjs --fix ${filenames
    .map((f) => `"${path.relative(process.cwd(), f)}"`)
    .join(' ')}`;

/**
 * @type {import('lint-staged').Configuration}
 */
const config = {
  '*.{js,jsx,ts,tsx}': [buildEslintCommand],
};

export default config;
