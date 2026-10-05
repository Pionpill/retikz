import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { matrixI18n } from './matrix-inputs.i18n';

/** 本节交互参数与默认值 */
export const createPreviewControlContract = (lang: Lang) => {
  const t = matrixI18n[lang];
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
              label: t.mode,
              defaultValue: 'items',
              options: [
                { value: 'items', label: 'items' },
                { value: 'data', label: 'data' },
              ],
            },
          ],
        },
      ],
    }),
    canonicalValues: { mode: 'items' },
    relatedApis: ['Matrix.items', 'Matrix.data'],
  } satisfies PreviewControlContract;
};
export const previewControlContract = createPreviewControlContract('zh');
