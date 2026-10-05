import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract, PreviewControlValuesFor } from '@/modules/docs/preview';

import { controlI18n } from './scatter-facet.i18n';
import { fertilityWorkData } from './scatter-fertility-work.data';

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
              rows: fertilityWorkData,
              columns: Object.keys(fertilityWorkData[0] ?? {}).map(key => ({ key })),
            },
          ],
        },
        {
          label: text.settings,
          controls: [
            { kind: 'switch', id: 'header', label: text.header, defaultValue: true },
            { kind: 'range', id: 'panelGap', label: text.panelGap, defaultValue: 20, min: 0, max: 40, step: 2 },
            { kind: 'range', id: 'size', label: text.size, defaultValue: 4, min: 1, max: 12, step: 1 },
            { kind: 'range', id: 'opacity', label: text.opacity, defaultValue: 0.65, min: 0.1, max: 1, step: 0.05 },
          ],
        },
      ],
    }),
    canonicalValues: { header: true, panelGap: 20, size: 4, opacity: 0.65 } as const,
    relatedApis: ['ScatterEncodings.facet', 'ScatterProperties'],
  } satisfies PreviewControlContract;
};
/** 当前示例的控件值 */
export type DemoValues = PreviewControlValuesFor<ReturnType<typeof createPreviewControlContract>['controls']>;
