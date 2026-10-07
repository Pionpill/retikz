import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { stackI18n } from './stack-inputs.i18n';

/** 本节公开参数与稳定默认值 */
export const createPreviewControlContract = (lang: Lang) => {
  const t = stackI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: t.title,
      sections: [
        {
          controls: [
            {
              id: 'input',
              kind: 'select',
              label: t.input,
              defaultValue: 'items',
              options: [
                { value: 'items', label: 'items' },
                { value: 'data', label: 'data' },
                { value: 'skeleton', label: 'skeleton' },
              ],
            },
            { id: 'empty', kind: 'switch', label: t.empty, defaultValue: false },
            {
              id: 'expand',
              kind: 'switch',
              label: t.expand,
              defaultValue: true,
              visibleWhen: { controlId: 'input', oneOf: ['data'] },
            },
          ],
        },
      ],
    }),
    canonicalValues: { input: 'items', empty: false, expand: true },
    relatedApis: ['Stack.items'],
  } satisfies PreviewControlContract;
};
export const previewControlContract = createPreviewControlContract('zh');
