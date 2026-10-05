import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract, PreviewControlValuesFor } from '@/modules/docs/preview';

import { controlI18n } from './strip-marks.i18n';
import { stripVegaBarleyData } from './strip-vega-barley.data';

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
              rows: stripVegaBarleyData,
              columns: Object.keys(stripVegaBarleyData[0] ?? {}).map(key => ({ key })),
            },
          ],
        },

        {
          label: text.settings,
          controls: [
            {
              kind: 'select',
              id: 'shape',
              label: text.shape,
              defaultValue: 'diamond',
              options: [
                { value: 'circle', label: text.shape_circle },
                { value: 'diamond', label: text.shape_diamond },
                { value: 'rectangle', label: text.shape_rectangle },
              ],
            },
            { kind: 'range', id: 'size', label: text.size, defaultValue: 4, min: 2, max: 10, step: 1 },
          ],
        },
      ],
    }),
    canonicalValues: {
      shape: 'diamond',
      size: 4,
    } as const,
    relatedApis: ['StripMark.properties'],
  } satisfies PreviewControlContract;
};

/** 当前示例的控件值 */
export type DemoValues = PreviewControlValuesFor<ReturnType<typeof createPreviewControlContract>['controls']>;
