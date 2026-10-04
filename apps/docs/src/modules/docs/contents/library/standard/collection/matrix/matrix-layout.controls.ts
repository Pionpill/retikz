import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { matrixI18n } from './matrix-layout.i18n';
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
              id: 'width',
              kind: 'select',
              label: t.width,
              defaultValue: 'auto',
              options: [
                { value: 'auto', label: 'auto' },
                { value: 'fixed', label: 'fixed' },
              ],
            },
            { id: 'rowGap', kind: 'range', label: t.rowGap, defaultValue: 6, min: 0, max: 20, step: 1 },
            { id: 'columnGap', kind: 'range', label: t.columnGap, defaultValue: 10, min: 0, max: 20, step: 1 },
            {
              id: 'row',
              kind: 'select',
              label: t.row,
              defaultValue: 'before',
              options: [
                { value: 'none', label: 'none' },
                { value: 'before', label: 'before' },
                { value: 'after', label: 'after' },
              ],
            },
            {
              id: 'column',
              kind: 'select',
              label: t.column,
              defaultValue: 'before',
              options: [
                { value: 'none', label: 'none' },
                { value: 'before', label: 'before' },
                { value: 'after', label: 'after' },
              ],
            },
          ],
        },
      ],
    }),
    canonicalValues: { width: 'auto', rowGap: 6, columnGap: 10, row: 'before', column: 'before' },
    relatedApis: ['Matrix.layout', 'Matrix.index', 'Matrix.style'],
  } satisfies PreviewControlContract;
};
export const previewControlContract = createPreviewControlContract('zh');
