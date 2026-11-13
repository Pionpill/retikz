import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract, PreviewControlValuesFor } from '@/modules/docs/preview';

import { slopeFacetData } from './slope-basic.data';
import { slopeFacetI18n } from './slope-facet.i18n';

/** 坡度图当前任务的可观察参数 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const text = slopeFacetI18n[lang];
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
              rows: slopeFacetData,
              columns: Object.keys(slopeFacetData[0] ?? {}).map(key => ({ key })),
            },
          ],
        },
        { controls: [{ kind: 'switch', id: 'facet', label: text.facet, defaultValue: true }] },
      ],
    }),
    canonicalValues: { facet: true } as const,
    relatedApis: ['SlopeProperties'],
  } satisfies PreviewControlContract;
};
export type SlopeFacetValues = PreviewControlValuesFor<ReturnType<typeof createPreviewControlContract>['controls']>;
