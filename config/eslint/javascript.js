/**
 * @see https://eslint.org/docs/latest/rules/
 */
export const javascriptRules = {
  /** 警告变量遮蔽（内层变量名与外层重复） */
  'no-shadow': 'warn',
  /** 禁止 var */
  'no-var': 'error',
  /** 优先使用 const */
  'prefer-const': 'error',
  /** 对 import / export 声明进行排序，替代 VS Code organize imports 的不可复现排序 */
  'simple-import-sort/imports': [
    'error',
    {
      groups: [
        ['^\\u0000'],
        ['^@?\\w.*\\u0000$'],
        ['^@?\\w'],
        ['^@/.*\\u0000$'],
        ['^@/'],
        ['^\\..*\\u0000$'],
        ['^\\.'],
      ],
    },
  ],
  '@retikz/import-type/separate-type-specifiers': 'error',
  'simple-import-sort/exports': 'error',
  /** 同名键值简写 */
  'object-shorthand': ['error', 'always'],
  /** 使用 ts 自己的提示 */
  'no-undef': 'off',
};
