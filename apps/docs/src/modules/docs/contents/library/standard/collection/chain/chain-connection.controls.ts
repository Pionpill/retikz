import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { chainI18n } from './chain-connection.i18n';

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
              id: 'route',
              kind: 'select',
              label: t['route'],
              defaultValue: 'auto',
              options: [
                { value: 'auto', label: t['auto'] },
                { value: 'straight', label: t['straight'] },
                { value: '|-', label: t['|-'] },
                { value: '-|', label: t['-|'] },
              ],
            },
            {
              id: 'arrow',
              kind: 'select',
              label: t['arrow'],
              defaultValue: '->',
              options: [
                { value: 'none', label: t['none'] },
                { value: '->', label: t['->'] },
                { value: '<->', label: t['<->'] },
              ],
            },
            { id: 'label', kind: 'text', label: t['label'], defaultValue: 'Chain' },
          ],
        },
      ],
    }),
    canonicalValues: { route: 'auto', arrow: '->', label: 'Chain' },
    relatedApis: ['Chain.layout', 'Chain.connection'],
  } satisfies PreviewControlContract;
};
export const previewControlContract = createPreviewControlContract('zh');
