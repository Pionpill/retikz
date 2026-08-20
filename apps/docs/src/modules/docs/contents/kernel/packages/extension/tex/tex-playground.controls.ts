import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Tex playground 使用的稳定字段 id */
export const TexPlaygroundControlId = {
  Source: 'source',
  DisplayMode: 'displayMode',
  FontSize: 'fontSize',
} as const;

/** Tex playground 预设使用的公式源码 */
export const TexPlaygroundFormula = {
  InlineEnergy: String.raw`E = mc^2`,
  DisplaySum: String.raw`\sum_{i=1}^{n} i^2 = \frac{n(n+1)(2n+1)}{6}`,
  MultilineDerivatives: String.raw`\begin{array}{rl}
f(x) &= ax^2 + bx + c\\
f'(x) &= 2ax + b\\
f''(x) &= 2a
\end{array}`,
} as const;

/** TeX 源码与排版度量的中文属性面板 */
export const texPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: '公式',
  sections: [
    {
      label: '公式',
      controls: [
        {
          kind: 'text',
          id: TexPlaygroundControlId.Source,
          label: 'TeX 源码',
          defaultValue: TexPlaygroundFormula.DisplaySum,
          placeholder: String.raw`\frac{a}{b} = c`,
          multiline: true,
        },
        {
          kind: 'select',
          id: TexPlaygroundControlId.DisplayMode,
          label: '度量模式',
          defaultValue: 'display',
          options: [
            { value: 'inline', label: 'inline' },
            { value: 'display', label: 'display' },
          ],
        },
        {
          kind: 'range',
          id: TexPlaygroundControlId.FontSize,
          label: '字号',
          defaultValue: 22,
          min: 14,
          max: 32,
          step: 1,
        },
      ],
    },
  ],
});

/** Tex playground 的稳定状态、预设与 API 覆盖 */
export const previewControlContract = {
  controls: texPlaygroundControls,
  canonicalValues: {
    source: TexPlaygroundFormula.DisplaySum,
    displayMode: 'display',
    fontSize: 22,
  },
  presetSelector: {
    label: '公式示例',
    customLabel: '自定义',
  },
  presets: [
    {
      id: 'inline-energy',
      label: '行内质能方程',
      values: {
        source: TexPlaygroundFormula.InlineEnergy,
        displayMode: 'inline',
        fontSize: 24,
      },
    },
    {
      id: 'display-sum',
      label: 'Display 求和',
      values: {
        source: TexPlaygroundFormula.DisplaySum,
        displayMode: 'display',
        fontSize: 22,
      },
    },
    {
      id: 'multiline-derivatives',
      label: '多行导数',
      values: {
        source: TexPlaygroundFormula.MultilineDerivatives,
        displayMode: 'display',
        fontSize: 18,
      },
    },
  ],
  relatedApis: ['Node.text', 'IRTexContent.tex', 'IRTexContent.displayMode', 'Node.font'],
} satisfies PreviewControlContract;
