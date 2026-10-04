import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { matrixI18n } from './matrix-content.i18n';
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
              defaultValue: 'data',
              options: [
                { value: 'data', label: 'data' },
                { value: 'jsx', label: 'jsx' },
              ],
            },
            {
              id: 'expand',
              visibleWhen: { controlId: 'mode', oneOf: ['data'] },
              kind: 'select',
              label: t.expand,
              defaultValue: 'all',
              options: [
                { value: 'all', label: 'all' },
                { value: 'none', label: 'none' },
                { value: 'map', label: 'map' },
                { value: 'array', label: 'array' },
              ],
            },
          ],
        },
      ],
    }),
    canonicalValues: { mode: 'data', expand: 'all' },
    relatedApis: ['Matrix.dataExpand', 'MatrixRow', 'MatrixCell'],
  } satisfies PreviewControlContract;
};
export const previewControlContract = createPreviewControlContract('zh');
