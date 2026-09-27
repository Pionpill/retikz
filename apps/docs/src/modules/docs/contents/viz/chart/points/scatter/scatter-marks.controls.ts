import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract, PreviewControlValuesFor } from '@/modules/docs/preview';

import { controlI18n } from './scatter-marks.i18n';
import { scatterMinimalData } from './scatter-minimal.data';
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
              rows: scatterMinimalData,
              columns: Object.keys(scatterMinimalData[0] ?? {}).map(key => ({ key })),
            },
          ],
        },
        {
          label: text.settings,
          controls: [
            { kind: 'switch', id: 'override', label: text.override, defaultValue: false },
            {
              kind: 'range',
              id: 'baseSize',
              visibleWhen: { controlId: 'override', oneOf: [false] },
              label: text.baseSize,
              defaultValue: 8,
              min: 2,
              max: 16,
              step: 1,
            },
            {
              kind: 'range',
              id: 'baseOpacity',
              visibleWhen: { controlId: 'override', oneOf: [false] },
              label: text.baseOpacity,
              defaultValue: 0.25,
              min: 0.05,
              max: 1,
              step: 0.05,
            },
            { kind: 'range', id: 'size', label: text.size, defaultValue: 3, min: 1, max: 12, step: 1 },
            { kind: 'range', id: 'opacity', label: text.opacity, defaultValue: 1, min: 0.1, max: 1, step: 0.05 },
          ],
        },
      ],
    }),
    canonicalValues: { override: false, baseSize: 8, baseOpacity: 0.25, size: 3, opacity: 1 } as const,
    relatedApis: ['ScatterMark.override', 'ScatterMark.properties'],
  } satisfies PreviewControlContract;
};
/** 当前示例的控件值 */
export type DemoValues = PreviewControlValuesFor<ReturnType<typeof createPreviewControlContract>['controls']>;
