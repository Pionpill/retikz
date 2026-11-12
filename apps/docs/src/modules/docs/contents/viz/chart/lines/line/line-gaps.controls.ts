import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract, PreviewControlValuesFor } from '@/modules/docs/preview';

import { lineGapsI18n } from './line-gaps.i18n';

/** 折线示例交互 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const text = lineGapsI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: text.settings,
      sections: [
        {
          controls: [
            { kind: 'switch', id: 'connectNulls', label: text.connectNulls, defaultValue: false },
            { kind: 'switch', id: 'point', label: text.point, defaultValue: true },
          ],
        },
      ],
    }),
    canonicalValues: { connectNulls: false, point: true } as const,
    relatedApis: ['LineProperties'],
  } satisfies PreviewControlContract;
};
/** 折线示例交互 */
export type LineGapsValues = PreviewControlValuesFor<ReturnType<typeof createPreviewControlContract>['controls']>;
