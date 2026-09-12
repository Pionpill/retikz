import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { texPlaygroundI18n } from './tex-playground.i18n';
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
export const createTexPlaygroundControls = (i18n: typeof texPlaygroundI18n.zh) =>
  definePreviewControls({
    presentation: 'panel',
    title: i18n.label1,
    sections: [
      {
        label: i18n.label2,
        controls: [
          {
            kind: 'text',
            id: TexPlaygroundControlId.Source,
            label: i18n.label3,
            defaultValue: TexPlaygroundFormula.DisplaySum,
            placeholder: String.raw`\frac{a}{b} = c`,
            multiline: true,
          },
          {
            kind: 'select',
            id: TexPlaygroundControlId.DisplayMode,
            label: i18n.label4,
            defaultValue: 'display',
            options: [
              { value: 'inline', label: i18n.label5 },
              { value: 'display', label: i18n.label6 },
            ],
          },
          {
            kind: 'range',
            id: TexPlaygroundControlId.FontSize,
            label: i18n.label7,
            defaultValue: 22,
            min: 14,
            max: 32,
            step: 1,
          },
        ],
      },
    ],
  });

export const texPlaygroundControls = createTexPlaygroundControls(texPlaygroundI18n.zh);

/** Tex playground 的稳定状态、预设与 API 覆盖 */
export const createPreviewControlContract = (lang: Lang) => {
  const i18n = texPlaygroundI18n[lang];

  return {
    controls: createTexPlaygroundControls(i18n),
    canonicalValues: {
      source: TexPlaygroundFormula.DisplaySum,
      displayMode: 'display',
      fontSize: 22,
    },
    presetSelector: {
      label: i18n.label8,
      customLabel: i18n.label9,
    },
    presets: [
      {
        id: 'inline-energy',
        label: i18n.label10,
        values: {
          source: TexPlaygroundFormula.InlineEnergy,
          displayMode: 'inline',
          fontSize: 24,
        },
      },
      {
        id: 'display-sum',
        label: i18n.label11,
        values: {
          source: TexPlaygroundFormula.DisplaySum,
          displayMode: 'display',
          fontSize: 22,
        },
      },
      {
        id: 'multiline-derivatives',
        label: i18n.label12,
        values: {
          source: TexPlaygroundFormula.MultilineDerivatives,
          displayMode: 'display',
          fontSize: 18,
        },
      },
    ],
    relatedApis: ['Node.text', 'IRTexContent.tex', 'IRTexContent.displayMode', 'Node.style.font'],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract('zh');
