import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { queueI18n } from './queue-composition.i18n';

/** 本节公开参数与稳定默认值 */
export const createPreviewControlContract = (lang: Lang) => {
  const t = queueI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: t.title,
      sections: [
        {
          controls: [
            { id: 'matrix', kind: 'switch', label: t.matrix, defaultValue: true },
            { id: 'dashed', kind: 'switch', label: t.dashed, defaultValue: true },
            { id: 'connect', kind: 'switch', label: t.connect, defaultValue: true },
          ],
        },
      ],
    }),
    canonicalValues: { matrix: true, dashed: true, connect: true },
    relatedApis: ['QueueItem'],
  } satisfies PreviewControlContract;
};
export const previewControlContract = createPreviewControlContract('zh');
