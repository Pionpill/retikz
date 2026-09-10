import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** 拓展用法 demo 的控件 id */
export const TexExtensionsControlId = {
  Example: 'example',
} as const;

/** 本示例固定展示并启用的公开 MathJax 扩展 */
export const TexExtensions = [
  'ams',
  'newcommand',
  'boldsymbol',
  'braket',
  'cancel',
  'cases',
  'centernot',
  'mathtools',
  'color',
] as const;

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

/** MathJaxEngineOptions 的 extensions 示例控件 */
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
      ],
    },
  ],
});

/** 拓展用法 demo 的稳定状态与 API 覆盖 */
export const previewControlContract = {
  controls: texExtensionsControls,
  canonicalValues: {
    example: 'none',
  },
  relatedApis: ['MathJaxEngineOptions.extensions', 'MathJaxExtension'],
} satisfies PreviewControlContract;
