import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { stackI18n } from './stack-layout.i18n';

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
              id: 'direction',
              kind: 'select',
              label: t.direction,
              defaultValue: 'up',
              options: [
                { value: 'up', label: t.up },
                { value: 'down', label: t.down },
                { value: 'left', label: t.left },
                { value: 'right', label: t.right },
              ],
            },
            { id: 'border', kind: 'switch', label: t.border, defaultValue: true },
            {
              id: 'padding',
              kind: 'select',
              label: t.padding,
              defaultValue: '8',
              options: [
                { value: '0', label: '0' },
                { value: '8', label: '8' },
                { value: '16', label: '16' },
              ],
            },
            { id: 'top', kind: 'switch', label: t.top, defaultValue: true },
          ],
        },
      ],
    }),
    canonicalValues: { direction: 'up', border: true, padding: '8', top: true },
    relatedApis: ['Stack.layout'],
  } satisfies PreviewControlContract;
};
export const previewControlContract = createPreviewControlContract('zh');
