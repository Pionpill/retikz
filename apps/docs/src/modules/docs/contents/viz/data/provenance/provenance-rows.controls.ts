import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { sourceRows } from './provenance-demo.data';
import { provenanceDemoI18n } from './provenance-demo.i18n';

/** 切换变换，观察同一输入的单行或组级来源 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const i18n = provenanceDemoI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: i18n.rows,
      sections: [
        {
          controls: [
            { kind: 'switch', id: 'provenance', label: i18n.provenance, defaultValue: true },
            {
              kind: 'table',
              id: 'rows',
              label: i18n.source,
              rows: sourceRows,
            },
            {
              kind: 'select',
              id: 'operation',
              label: i18n.operation,
              defaultValue: 'sort',
              options: ['sort', 'select', 'annotate', 'summarize', 'smooth'].map(value => ({
                value,
                label: i18n[value as 'sort' | 'select' | 'annotate' | 'summarize' | 'smooth'],
              })),
            },
          ],
        },
      ],
    }),
    canonicalValues: { operation: 'sort', provenance: true },
    relatedApis: ['readSourceIndex', 'readSourceIndices'],
  } satisfies PreviewControlContract;
};
/** 中文注册基线 */
export const previewControlContract = createPreviewControlContract();
