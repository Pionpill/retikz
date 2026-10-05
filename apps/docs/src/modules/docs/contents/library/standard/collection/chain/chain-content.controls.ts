import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { chainI18n } from './chain-content.i18n';

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
            { id: 'width', kind: 'range', label: t['width'], defaultValue: 64, min: 24, max: 80, step: 4 },
            {
              id: 'overflow',
              kind: 'select',
              label: t['overflow'],
              defaultValue: 'clip',
              options: [
                { value: 'clip', label: t['clip'] },
                { value: 'visible', label: t['visible'] },
              ],
            },
          ],
        },
      ],
    }),
    canonicalValues: { width: 64, overflow: 'clip' },
    relatedApis: ['Chain.layout', 'Chain.connection'],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract('zh');
