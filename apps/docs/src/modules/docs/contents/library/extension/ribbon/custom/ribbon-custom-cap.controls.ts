import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { ribbonCustomCapI18n } from './ribbon-custom-cap.i18n';

/** 端帽深度控件 */
export const createPreviewControlContract = (lang: Lang) => {
  const text = ribbonCustomCapI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: text.title,
      sections: [
        {
          label: text.title,
          controls: [{ kind: 'range', id: 'depth', label: text.depth, defaultValue: 24, min: 0, max: 60, step: 2 }],
        },
      ],
    }),
    canonicalValues: { depth: 24 },
    relatedApis: ['Path.kindOptions.start.cap'],
  } satisfies PreviewControlContract;
};
export const previewControlContract = createPreviewControlContract('zh');
