import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract, PreviewControlValuesFor } from '@/modules/docs/preview';

import { gapminderBubbleData } from './bubble-basic.data';
import { controlI18n } from './bubble-facet.i18n';
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
              rows: gapminderBubbleData,
              columns: Object.keys(gapminderBubbleData[0] ?? {}).map(key => ({ key })),
            },
          ],
        },
        {
          label: text.settings,
          controls: [
            { kind: 'switch', id: 'header', label: text.header, defaultValue: true },
            { kind: 'range', id: 'panelGap', label: text.panelGap, defaultValue: 12, min: 0, max: 40, step: 2 },
            {
              kind: 'range',
              id: 'fillOpacity',
              label: text.fillOpacity,
              defaultValue: 0.5,
              min: 0.1,
              max: 1,
              step: 0.05,
            },
          ],
        },
      ],
    }),
    canonicalValues: { header: true, panelGap: 12, fillOpacity: 0.5 } as const,
    relatedApis: ['BubbleEncodings.facet', 'BubbleProperties'],
  } satisfies PreviewControlContract;
};
/** 当前示例的控件值 */
export type DemoValues = PreviewControlValuesFor<ReturnType<typeof createPreviewControlContract>['controls']>;
