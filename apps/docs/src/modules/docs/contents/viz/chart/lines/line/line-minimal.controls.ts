import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { lineData } from './line-basic.data';
import { minimalI18n } from './line-minimal.i18n';

/** 最小示例的只读输入数据 */
export const createPreviewControlContract = (lang: Lang = 'zh') =>
  ({
    controls: definePreviewControls({
      presentation: 'panel',
      sections: [
        {
          controls: [
            {
              kind: 'table',
              id: 'rows',
              label: minimalI18n[lang].data,
              rows: lineData,
              columns: Object.keys(lineData[0] ?? {}).map(key => ({ key })),
            },
          ],
        },
      ],
    }),
    canonicalValues: {},
    relatedApis: [],
  }) satisfies PreviewControlContract;
