import eslintConfig from './config/eslint/index.js';

/** @type {import('eslint').Linter.Config[]} */
const config = [
  ...eslintConfig,
  {
    name: '@retikz/docs-demo-modules',
    files: ['apps/docs/src/modules/docs/contents/**/*.demo.tsx'],
    rules: {
      'react-refresh/only-export-components': [
        'error',
        { allowExportNames: ['previewControls', 'previewIR', 'previewSource'] },
      ],
    },
  },
];

export default config;
