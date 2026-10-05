import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { chainI18n } from './chain-inputs.i18n';
/** 本节参数及默认状态 */
export const createPreviewControlContract = (lang: Lang) => {
  const t = chainI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: t.title,
      sections: [
        {
          controls: [
            {
              id: 'mode',
              kind: 'select',
              label: t['mode'],
              defaultValue: 'branches',
              options: [
                { value: 'items', label: t['items'] },
                { value: 'data', label: t['data'] },
                { value: 'count', label: t['count'] },
                { value: 'labels', label: t['labels'] },
                { value: 'branches', label: t['branches'] },
              ],
            },
          ],
        },
      ],
    }),
    canonicalValues: { mode: 'branches' },
    relatedApis: ['Chain.layout', 'Chain.connection'],
  } satisfies PreviewControlContract;
};
export const previewControlContract = createPreviewControlContract('zh');
