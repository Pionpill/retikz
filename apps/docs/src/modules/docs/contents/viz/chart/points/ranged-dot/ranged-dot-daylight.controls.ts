import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { rangedDotDaylightData } from './ranged-dot-daylight.data';
import { rangedDotDaylightI18n } from './ranged-dot-daylight.i18n';

/** 环形白昼示例的双语控件契约 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const text = rangedDotDaylightI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: text.title,
      sections: [
        {
          controls: [
            {
              kind: 'table',
              id: 'rows',
              label: text.sample,
              rows: rangedDotDaylightData,
              columns: [{ key: 'date' }, { key: 'sunrise' }, { key: 'sunset' }],
            },
          ],
        },
      ],
    }),
    canonicalValues: {},
    relatedApis: [],
  } satisfies PreviewControlContract;
};
