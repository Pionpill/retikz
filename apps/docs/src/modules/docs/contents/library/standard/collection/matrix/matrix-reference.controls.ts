import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { matrixI18n } from './matrix-reference.i18n';

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
            { id: 'row', kind: 'range', label: t.row, defaultValue: 0, min: 0, max: 3, step: 1 },
            { id: 'column', kind: 'range', label: t.column, defaultValue: 0, min: 0, max: 4, step: 1 },
            {
              id: 'overflow',
              kind: 'select',
              label: t.overflow,
              defaultValue: 'clip',
              options: [
                { value: 'clip', label: 'clip' },
                { value: 'visible', label: 'visible' },
              ],
            },
            { id: 'label', kind: 'text', label: t.label, defaultValue: 'M' },
          ],
        },
      ],
    }),
    canonicalValues: { row: 0, column: 0, overflow: 'clip', label: 'M' },
    relatedApis: ['Matrix.cellIdMode', 'Matrix.label', 'Matrix.layout.overflow'],
  } satisfies PreviewControlContract;
};
export const previewControlContract = createPreviewControlContract('zh');
