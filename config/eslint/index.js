import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import { default as tseslint } from 'typescript-eslint';
import { javascriptRules } from './javascript.js';
import { typescriptRules } from './typescript.js';

const languageOptions = {
    sourceType: 'module',
    ecmaVersion: 2020,
    globals: {
        ...globals.browser,
    },
};

const eslintConfig = [
    {
        name: '@fx-data-agent-web/ignore',
        ignores: [
            '**/node_modules/**',
            '**/build/**',
            '**/dist/**',
            '**/postcss.config.js',
            '**/vite.config.ts',
            // shadcn/ui 的 components/ui/* 与 hooks/use-mobile.ts 是 vendored 代码，
            // 由 shadcn CLI 直接拷入；按 node_modules 同等对待，不参与项目 lint
            '**/components/ui/**',
            '**/hooks/use-mobile.ts',
        ],
    },
    {
        name: '@fx-data-agent-web/javascript',
        files: ['**/*.{js,jsx,ts,tsx}'],
        languageOptions,
        plugins: {
            js,
        },
        rules: {
            ...js.configs.recommended.rules,
            ...javascriptRules,
        },
    },
    {
        name: '@fx-data-agent-web/typescript',
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            ...languageOptions,
            parser: tseslint.parser,
            parserOptions: {
                projectService: true,
                parser: tseslint.parser,
            },
        },
        plugins: {
            '@typescript-eslint': tseslint.plugin,
        },
        rules: {
            ...tseslint.configs.recommended.rules,
            ...typescriptRules,
        },
    },
    {
        name: '@fx-data-agent-web/react',
        files: ['**/*.{jsx,tsx}'],
        languageOptions,
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            ...reactRefresh.configs.recommended.rules,
        },
    },
];

export default eslintConfig;
