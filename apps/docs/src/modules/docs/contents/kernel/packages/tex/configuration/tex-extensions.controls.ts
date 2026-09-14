import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { texExtensionsI18n } from './tex-extensions.i18n';

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
export const createTexExtensionsControls = (i18n: typeof texExtensionsI18n.zh) =>
  definePreviewControls({
    presentation: 'panel',
    title: i18n.label1,
    sections: [
      {
        label: i18n.label2,
        controls: [
          {
            kind: 'select',
            id: TexExtensionsControlId.Example,
            label: i18n.label3,
            defaultValue: 'none',
            options: [
              { value: 'none', label: i18n.label4 },
              { value: 'ams', label: i18n.label5 },
              { value: 'newcommand', label: i18n.label6 },
              { value: 'boldsymbol', label: i18n.label7 },
              { value: 'braket', label: i18n.label8 },
              { value: 'cancel', label: i18n.label9 },
              { value: 'cases', label: i18n.label10 },
              { value: 'centernot', label: i18n.label11 },
              { value: 'mathtools', label: i18n.label12 },
              { value: 'color', label: i18n.label13 },
            ],
          },
        ],
      },
    ],
  });

export const texExtensionsControls = createTexExtensionsControls(texExtensionsI18n.zh);

/** 拓展用法 demo 的稳定状态与 API 覆盖 */
export const createPreviewControlContract = (lang: Lang) => {
  const i18n = texExtensionsI18n[lang];

  return {
    controls: createTexExtensionsControls(i18n),
    canonicalValues: {
      example: 'none',
    },
    relatedApis: ['MathJaxEngineOptions.extensions', 'MathJaxExtension'],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract('zh');
