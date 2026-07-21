import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Tex playground 使用的稳定字段 id */
export const TexPlaygroundControlId = {
  Source: 'source',
  DisplayMode: 'displayMode',
  FontSize: 'fontSize',
  Shape: 'shape',
  Padding: 'padding',
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
  FramedContour: String.raw`\oint_C \vec{F} \cdot d\vec{r}`,
} as const;

/** 只有启用 Node 容器时才显示 padding */
export const TexPlaygroundVisibleWhen = {
  Padding: { controlId: TexPlaygroundControlId.Shape, oneOf: ['rectangle', 'circle'] },
} as const;

/** TeX 源码、度量与容器的中文属性面板 */
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
    {
      label: '容器',
      controls: [
        {
          kind: 'select',
          id: TexPlaygroundControlId.Shape,
          label: 'shape',
          defaultValue: 'none',
          options: [
            { value: 'none', label: '无边框' },
            { value: 'rectangle', label: '矩形' },
            { value: 'circle', label: '圆形' },
          ],
        },
        {
          kind: 'range',
          id: TexPlaygroundControlId.Padding,
          label: 'padding',
          defaultValue: 14,
          min: 4,
          max: 28,
          step: 1,
          visibleWhen: TexPlaygroundVisibleWhen.Padding,
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
    shape: 'none',
    padding: 14,
  },
  presets: [
    {
      id: 'inline-energy',
      label: '行内质能方程',
      values: {
        source: TexPlaygroundFormula.InlineEnergy,
        displayMode: 'inline',
        fontSize: 24,
        shape: 'none',
        padding: 14,
      },
    },
    {
      id: 'display-sum',
      label: 'Display 求和',
      values: {
        source: TexPlaygroundFormula.DisplaySum,
        displayMode: 'display',
        fontSize: 22,
        shape: 'none',
        padding: 14,
      },
    },
    {
      id: 'multiline-derivatives',
      label: '多行导数',
      values: {
        source: TexPlaygroundFormula.MultilineDerivatives,
        displayMode: 'display',
        fontSize: 18,
        shape: 'rectangle',
        padding: 14,
      },
    },
    {
      id: 'framed-contour',
      label: '带框环路积分',
      values: {
        source: TexPlaygroundFormula.FramedContour,
        displayMode: 'display',
        fontSize: 22,
        shape: 'circle',
        padding: 18,
      },
    },
  ],
  relatedApis: ['Node.text', 'IRTexContent.tex', 'IRTexContent.displayMode', 'Node.font', 'Node.shape', 'Node.padding'],
} satisfies PreviewControlContract;
