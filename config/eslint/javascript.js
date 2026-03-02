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
    /** 对导入成员进行排序以保持风格统一 */
    'sort-imports': ['error', { ignoreDeclarationSort: true }],
    /** 同名键值简写 */
    'object-shorthand': ['error', 'always'],
    /** 使用 ts 自己的提示 */
    'no-undef': 'off',
};
