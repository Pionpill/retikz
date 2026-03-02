/**
 * @see https://typescript-eslint.io/rules/
 */
export const typescriptRules = {
    /** 统一数组使用泛型写法 */
    '@typescript-eslint/array-type': ['error', { default: 'generic', readonly: 'generic' }],
    /** 禁止 @ts-ignore, 使用 @ts-expect-error + 原因代替 */
    '@typescript-eslint/ban-ts-comment': [
        'error',
        {
            'ts-expect-error': false,
            'ts-ignore': 'allow-with-description',
        },
    ],
    /** 强制使用 import type { T } 导入类型 */
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    /** 在接口/类型里里使用属性签名的风格 */
    '@typescript-eslint/method-signature-style': ['error', 'property'],
    /** 命名规范 */
    '@typescript-eslint/naming-convention': [
        'error',
        {
            selector: 'typeParameter',
            format: ['PascalCase'],
            leadingUnderscore: 'forbid',
            trailingUnderscore: 'forbid',
            custom: {
                regex: '^(T|T[A-Z][A-Za-z]+)$',
                match: true,
            },
        },
    ],
    /** 禁止 enum 中出现重复的值 */
    '@typescript-eslint/no-duplicate-enum-values': 'error',
    /** 禁止多余的非空断言 */
    '@typescript-eslint/no-extra-non-null-assertion': 'error',
    /** 禁止使用 for-in 遍历数组，防止遍历索引 */
    '@typescript-eslint/no-for-in-array': 'error',
    /** 禁止给编译器能推断出的变量写显式类型，允许函数参数声明 */
    '@typescript-eslint/no-inferrable-types': ['error', { ignoreParameters: true }],
    /** 检查 new/构造声明的滥用 */
    '@typescript-eslint/no-misused-new': 'error',
    /** 禁止使用 TypeScript 的 namespace，使用 es 的 import 处理 */
    '@typescript-eslint/no-namespace': 'error',
    /** 禁止在可选链之后使用非空断言 */
    '@typescript-eslint/no-non-null-asserted-optional-chain': 'error',
    /** 检测总是为真/假或无需的条件判断 */
    '@typescript-eslint/no-unnecessary-condition': 'error',
    /** 禁止不必要的类型断言（as）*/
    '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    /** 禁止使用内置的 Function 类型作为函数类型 */
    '@typescript-eslint/no-unsafe-function-type': 'error',
    /** 禁止使用 String / Number / Boolean 等对象包装类型 */
    '@typescript-eslint/no-wrapper-object-types': 'error',
    /** 鼓励使用 as const 来保留字面量类型（而不是显式类型） */
    '@typescript-eslint/prefer-as-const': 'error',
    /** 建议使用 for-of 遍历数组 */
    '@typescript-eslint/prefer-for-of': 'warn',
    /** 警告声明为 async 但内部没有 await 的函数 */
    '@typescript-eslint/require-await': 'warn',
    /** 禁止使用 /// <reference ... /> 三斜线指令，鼓励用 ES6 风格导入。 */
    '@typescript-eslint/triple-slash-reference': 'error',
    /** 禁止未使用的表达式 */
    '@typescript-eslint/no-unused-expressions': [
        'error',
        {
            allowShortCircuit: true,
            allowTernary: true,
            allowTaggedTemplates: true,
        },
    ],
};
