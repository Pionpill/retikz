import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract, PreviewControlValuesFor } from '@/modules/docs/preview';

import { slopeData, slopeMappingRows } from './slope-basic.data';
import { slopeMappingI18n } from './slope-mapping.i18n';

/** 坡度图当前任务的可观察参数 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const text = slopeMappingI18n[lang];
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
              views: [
                { id: 'input', label: text.currentData, rows: values => slopeMappingRows(values.shuffle === true) },
                { id: 'source', label: text.sourceData, rows: slopeData },
              ],
              columns: Object.keys(slopeData[0] ?? {}).map(key => ({ key })),
            },
          ],
        },
        {
          controls: [
            { kind: 'switch', id: 'reverse', label: text.reverse, defaultValue: false },
            { kind: 'switch', id: 'shuffle', label: text.shuffle, defaultValue: false },
          ],
        },
      ],
    }),
    canonicalValues: { reverse: false, shuffle: false } as const,
    relatedApis: ['SlopeProperties'],
  } satisfies PreviewControlContract;
};
export type SlopeMappingValues = PreviewControlValuesFor<ReturnType<typeof createPreviewControlContract>['controls']>;
