import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract, PreviewControlValuesFor } from '@/modules/docs/preview';

import { slopeData } from './slope-basic.data';
import { slopeMarkI18n } from './slope-mark.i18n';

/** 坡度图当前任务的可观察参数 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const text = slopeMarkI18n[lang];
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
              label: text.data,
              rows: slopeData,
              columns: Object.keys(slopeData[0] ?? {}).map(key => ({ key })),
            },
          ],
        },
        {
          controls: [
            { kind: 'switch', id: 'override', label: text.override, defaultValue: false },
            { kind: 'switch', id: 'point', label: text.point, defaultValue: false },
          ],
        },
      ],
    }),
    canonicalValues: { override: false, point: false } as const,
    relatedApis: ['SlopeProperties'],
  } satisfies PreviewControlContract;
};
export type SlopeMarkValues = PreviewControlValuesFor<ReturnType<typeof createPreviewControlContract>['controls']>;
