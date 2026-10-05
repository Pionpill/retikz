import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { chainI18n } from './chain-alignment.i18n';

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
              id: 'direction',
              kind: 'select',
              label: t['direction'],
              defaultValue: 'right',
              options: [
                { value: 'right', label: t['right'] },
                { value: 'down', label: t['down'] },
              ],
            },
            {
              id: 'align',
              kind: 'select',
              label: t['align'],
              defaultValue: 'center',
              options: [
                { value: 'start', label: t['start'] },
                { value: 'center', label: t['center'] },
                { value: 'end', label: t['end'] },
                { value: 'main', label: t['main'] },
              ],
            },
            {
              id: 'spacing',
              kind: 'select',
              label: t['spacing'],
              defaultValue: 'steps',
              options: [
                { value: 'compact', label: t['compact'] },
                { value: 'steps', label: t['steps'] },
              ],
            },
            {
              id: 'justify',
              kind: 'select',
              label: t['justify'],
              defaultValue: 'start',
              options: [
                { value: 'start', label: t['start'] },
                { value: 'center', label: t['center'] },
                { value: 'end', label: t['end'] },
              ],
            },
          ],
        },
      ],
    }),
    canonicalValues: { direction: 'right', align: 'center', spacing: 'steps', justify: 'start' },
    relatedApis: ['Chain.layout', 'Chain.connection'],
  } satisfies PreviewControlContract;
};
export const previewControlContract = createPreviewControlContract('zh');
