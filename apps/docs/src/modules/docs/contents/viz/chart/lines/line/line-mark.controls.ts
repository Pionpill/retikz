import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract, PreviewControlValuesFor } from '@/modules/docs/preview';

import { lineData } from './line-basic.data';
import { lineMarkI18n } from './line-mark.i18n';

/** 折线示例交互 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const text = lineMarkI18n[lang];
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
            { kind: 'switch', id: 'override', label: text.override, defaultValue: false },
            { kind: 'switch', id: 'point', label: text.point, defaultValue: false },
          ],
        },
      ],
    }),
    canonicalValues: { override: false, point: false } as const,
    relatedApis: ['LineMark'],
  } satisfies PreviewControlContract;
};
/** 折线示例交互 */
export type LineMarkValues = PreviewControlValuesFor<ReturnType<typeof createPreviewControlContract>['controls']>;
