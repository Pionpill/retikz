import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { matrixI18n } from './matrix-skeleton.i18n';

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
              defaultValue: 'symbols',
              options: [
                { value: 'empty', label: 'empty' },
                { value: 'symbols', label: 'symbols' },
              ],
            },
            { id: 'rows', kind: 'range', label: t.rows, defaultValue: 3, min: 0, max: 4, step: 1 },
            { id: 'columns', kind: 'range', label: t.columns, defaultValue: 4, min: 0, max: 5, step: 1 },
            {
              id: 'index',
              kind: 'select',
              label: t.index,
              defaultValue: 'auto',
              options: [
                { value: 'none', label: 'none' },
                { value: 'auto', label: 'auto' },
              ],
            },
          ],
        },
      ],
    }),
    canonicalValues: { mode: 'symbols', rows: 3, columns: 4, index: 'auto' },
    relatedApis: ['Matrix.skeleton', 'Matrix.index'],
  } satisfies PreviewControlContract;
};
export const previewControlContract = createPreviewControlContract('zh');
