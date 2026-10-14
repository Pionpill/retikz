import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { createPlotTransformTableViews } from '../transform-table-views';
import { entryOperation, entryRows } from './transform-entry.data';
import { transformEntryI18n } from './transform-entry.i18n';

/** 接入示例的双语只读数据视图 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const i18n = transformEntryI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: i18n.title,
      sections: [
        {
          controls: [
            {
              kind: 'table',
              id: 'rows',
              label: i18n.rows,
              views: createPlotTransformTableViews(i18n, entryRows, () => entryOperation),
              columns: [{ key: 'month' }, { key: 'value' }, { key: 'share' }],
            },
          ],
        },
      ],
    }),
    canonicalValues: {},
    relatedApis: ['IRDataNormalizeTransform'],
  } satisfies PreviewControlContract;
};

/** 默认中文注册契约 */
export const previewControlContract = createPreviewControlContract();
