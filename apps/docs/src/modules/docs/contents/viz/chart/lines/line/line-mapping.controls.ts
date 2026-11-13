import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract, PreviewControlValuesFor } from '@/modules/docs/preview';

import { lineData, lineMappingRows } from './line-basic.data';
import { lineMappingI18n } from './line-mapping.i18n';

/** 折线示例交互 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const text = lineMappingI18n[lang];
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
                { id: 'input', label: text.currentData, rows: values => lineMappingRows(values.shuffle === true) },
                { id: 'source', label: text.sourceData, rows: lineData },
              ],
              columns: Object.keys(lineData[0] ?? {}).map(key => ({ key })),
            },
          ],
        },
        {
          controls: [
            { kind: 'switch', id: 'series', label: text.series, defaultValue: true },
            { kind: 'switch', id: 'shuffle', label: text.shuffle, defaultValue: false },
          ],
        },
      ],
    }),
    canonicalValues: { series: true, shuffle: false } as const,
    relatedApis: ['LineEncodings'],
  } satisfies PreviewControlContract;
};
/** 折线示例交互 */
export type LineMappingValues = PreviewControlValuesFor<ReturnType<typeof createPreviewControlContract>['controls']>;
