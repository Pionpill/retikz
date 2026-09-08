import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** 拓展用法 demo 的控件 id */
export const TexExtensionsControlId = {
  Example: 'example',
  Profile: 'profile',
  Ams: 'ams',
  Newcommand: 'newcommand',
  Boldsymbol: 'boldsymbol',
  Braket: 'braket',
  Cancel: 'cancel',
  Cases: 'cases',
  Centernot: 'centernot',
  Mathtools: 'mathtools',
  Color: 'color',
} as const;

/** 每个 MathJax 扩展对应的可观察公式内容 */
export const TexExtensionExample = {
  none: String.raw`x^2 + y^2 = z^2`,
  ams: String.raw`\begin{aligned} f(x) &= x^2 + 1 \\ f'(x) &= 2x \end{aligned}`,
  newcommand: String.raw`\newcommand{\vect}[1]{\mathbf{#1}}\vect{x} + \vect{y}`,
  boldsymbol: String.raw`\boldsymbol{\alpha} + \boldsymbol{\beta}`,
  braket: String.raw`\bra{\psi}\hat{H}\ket{\psi}`,
  cancel: String.raw`\cancel{x} + \bcancel{y}`,
  cases: String.raw`\begin{cases} x^2, & x \ge 0 \\ -x, & x < 0 \end{cases}`,
  centernot: String.raw`A \centernot\subseteq B`,
  mathtools: String.raw`f(x) \coloneqq x^2 + 1`,
  color: String.raw`\color{crimson}{x} + \colorbox{gold}{y}`,
} as const;

const requiredTexExtensionControlIds: Partial<Record<keyof typeof TexExtensionExample, string>> = {
  ams: TexExtensionsControlId.Ams,
  newcommand: TexExtensionsControlId.Newcommand,
  boldsymbol: TexExtensionsControlId.Boldsymbol,
  braket: TexExtensionsControlId.Braket,
  cancel: TexExtensionsControlId.Cancel,
  cases: TexExtensionsControlId.Cases,
  centernot: TexExtensionsControlId.Centernot,
  mathtools: TexExtensionsControlId.Mathtools,
  color: TexExtensionsControlId.Color,
};

/** 返回公式示例正常渲染所需的扩展开关 id */
export const getRequiredTexExtensionControlId = (example: keyof typeof TexExtensionExample): string | undefined =>
  requiredTexExtensionControlIds[example];

/** 判断扩展开关是否由用户或当前公式示例启用 */
export const isTexExtensionControlActive = (
  values: { example: keyof typeof TexExtensionExample; [key: string]: unknown },
  controlId: string,
): boolean => values[controlId] === true || getRequiredTexExtensionControlId(values.example) === controlId;

/** MathJaxEngineOptions 的 profile 与 extensions 控件 */
export const texExtensionsControls = definePreviewControls({
  presentation: 'panel',
  title: '拓展用法',
  sections: [
    {
      label: '引擎参数',
      controls: [
        {
          kind: 'select',
          id: TexExtensionsControlId.Example,
          label: '公式示例',
          defaultValue: 'none',
          options: [
            { value: 'none', label: '基础 TeX' },
            { value: 'ams', label: 'AMS 对齐环境' },
            { value: 'newcommand', label: '自定义命令' },
            { value: 'boldsymbol', label: '粗体数学符号' },
            { value: 'braket', label: 'bra-ket 记号' },
            { value: 'cancel', label: '消去标记' },
            { value: 'cases', label: '分情况环境' },
            { value: 'centernot', label: '居中否定' },
            { value: 'mathtools', label: '数学工具' },
            { value: 'color', label: '颜色命令' },
          ],
        },
        {
          kind: 'select',
          id: TexExtensionsControlId.Profile,
          label: 'profile 配置',
          defaultValue: 'base',
          options: [
            { value: 'base', label: '基础（base）' },
            { value: 'math', label: '数学扩展（math）' },
          ],
        },
      ],
    },
    {
      label: 'extensions 追加项',
      controls: [
        {
          kind: 'switch',
          id: TexExtensionsControlId.Ams,
          label: '启用 ams',
          defaultValue: false,
        },
        {
          kind: 'switch',
          id: TexExtensionsControlId.Newcommand,
          label: '启用 newcommand',
          defaultValue: false,
        },
        {
          kind: 'switch',
          id: TexExtensionsControlId.Boldsymbol,
          label: '启用 boldsymbol',
          defaultValue: false,
        },
        {
          kind: 'switch',
          id: TexExtensionsControlId.Braket,
          label: '启用 braket',
          defaultValue: false,
        },
        {
          kind: 'switch',
          id: TexExtensionsControlId.Cancel,
          label: '启用 cancel',
          defaultValue: false,
        },
        {
          kind: 'switch',
          id: TexExtensionsControlId.Cases,
          label: '启用 cases',
          defaultValue: false,
        },
        {
          kind: 'switch',
          id: TexExtensionsControlId.Centernot,
          label: '启用 centernot',
          defaultValue: false,
        },
        {
          kind: 'switch',
          id: TexExtensionsControlId.Mathtools,
          label: '启用 mathtools',
          defaultValue: false,
        },
        {
          kind: 'switch',
          id: TexExtensionsControlId.Color,
          label: '启用 color',
          defaultValue: false,
        },
      ],
    },
  ],
});

/** 拓展用法 demo 的稳定状态与 API 覆盖 */
export const previewControlContract = {
  controls: texExtensionsControls,
  canonicalValues: {
    example: 'none',
    profile: 'base',
    ams: false,
    newcommand: false,
    boldsymbol: false,
    braket: false,
    cancel: false,
    cases: false,
    centernot: false,
    mathtools: false,
    color: false,
  },
  relatedApis: [
    'MathJaxEngineOptions.profile',
    'MathJaxEngineOptions.extensions',
    'MathJaxProfile',
    'MathJaxExtension',
  ],
} satisfies PreviewControlContract;
