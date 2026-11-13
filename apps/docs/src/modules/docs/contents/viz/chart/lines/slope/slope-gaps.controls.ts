import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract, PreviewControlValuesFor } from '@/modules/docs/preview';

import { slopeData, slopeGapsRows } from './slope-basic.data';
import { slopeGapsI18n } from './slope-gaps.i18n';

/** 坡度图当前任务的可观察参数 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const text = slopeGapsI18n[lang];
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
                { id: 'input', label: text.currentData, rows: values => slopeGapsRows(values.missing === true) },
                { id: 'source', label: text.sourceData, rows: slopeData },
              ],
              columns: Object.keys(slopeData[0] ?? {}).map(key => ({ key })),
            },
          ],
        },
        {
          controls: [
            { kind: 'switch', id: 'missing', label: text.missing, defaultValue: true },
            { kind: 'switch', id: 'label', label: text.label, defaultValue: true },
          ],
        },
      ],
    }),
    canonicalValues: { missing: true, label: true } as const,
    relatedApis: ['SlopeProperties'],
  } satisfies PreviewControlContract;
};
export type SlopeGapsValues = PreviewControlValuesFor<ReturnType<typeof createPreviewControlContract>['controls']>;
