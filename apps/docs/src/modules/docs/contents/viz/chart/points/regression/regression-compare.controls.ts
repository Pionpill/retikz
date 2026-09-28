import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract, PreviewControlValuesFor } from '@/modules/docs/preview';

import { irisRegressionData } from './regression-basic.data';
import { controlI18n } from './regression-compare.i18n';
/** 示例属性的双语交互契约 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const text = controlI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: text.settings,
      sections: [
        {
          label: text.data,
          defaultCollapsed: true,
          controls: [
            {
              kind: 'table',
              id: 'rows',
              label: text.samples,
              rows: irisRegressionData,
              columns: Object.keys(irisRegressionData[0] ?? {}).map(key => ({ key })),
            },
          ],
        },
        {
          label: text.settings,
          controls: [
            {
              kind: 'select',
              id: 'curve',
              label: text.curve,
              defaultValue: 'catmullRom',
              options: [
                { value: 'catmullRom', label: text.smooth },
                { value: 'linear', label: text.linear },
              ],
            },
            { kind: 'range', id: 'sampleCount', label: text.sampleCount, defaultValue: 16, min: 4, max: 64, step: 1 },
            { kind: 'range', id: 'order', label: text.order, defaultValue: 3, min: 2, max: 5, step: 1 },
            { kind: 'color', id: 'linearColor', label: text.linearColor, defaultValue: '#1e90ff' },
            { kind: 'color', id: 'polynomialColor', label: text.polynomialColor, defaultValue: '#ff8c00' },
            { kind: 'range', id: 'strokeWidth', label: text.strokeWidth, defaultValue: 2, min: 0.5, max: 5, step: 0.5 },
            { kind: 'switch', id: 'dashed', label: text.dashed, defaultValue: true },
            { kind: 'range', id: 'size', label: text.size, defaultValue: 4, min: 1, max: 12, step: 1 },
            { kind: 'range', id: 'opacity', label: text.opacity, defaultValue: 0.4, min: 0.1, max: 1, step: 0.05 },
          ],
        },
      ],
    }),
    canonicalValues: {
      curve: 'catmullRom',
      sampleCount: 16,
      order: 3,
      linearColor: '#1e90ff',
      polynomialColor: '#ff8c00',
      strokeWidth: 2,
      dashed: true,
      size: 4,
      opacity: 0.4,
    } as const,
    relatedApis: ['RegressionEncodings', 'RegressionProperties'],
  } satisfies PreviewControlContract;
};
/** 当前示例的控件值 */
export type DemoValues = PreviewControlValuesFor<ReturnType<typeof createPreviewControlContract>['controls']>;
