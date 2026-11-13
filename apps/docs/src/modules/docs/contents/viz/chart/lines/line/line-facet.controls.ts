import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract, PreviewControlValuesFor } from '@/modules/docs/preview';

import { lineData } from './line-basic.data';
import { lineFacetI18n } from './line-facet.i18n';

/** 折线示例交互 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const text = lineFacetI18n[lang];
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
              rows: lineData,
              columns: Object.keys(lineData[0] ?? {}).map(key => ({ key })),
            },
          ],
        },
        {
          controls: [
            { kind: 'switch', id: 'facet', label: text.facet, defaultValue: true },
            {
              kind: 'switch',
              id: 'header',
              label: text.header,
              defaultValue: true,
              visibleWhen: { controlId: 'facet', oneOf: [true] },
            },
          ],
        },
      ],
    }),
    canonicalValues: { facet: true, header: true } as const,
    relatedApis: ['LineEncodings'],
  } satisfies PreviewControlContract;
};
/** 折线示例交互 */
export type LineFacetValues = PreviewControlValuesFor<ReturnType<typeof createPreviewControlContract>['controls']>;
