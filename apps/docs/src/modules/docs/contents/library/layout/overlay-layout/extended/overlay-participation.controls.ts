import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { demoI18n } from './overlay-participation.i18n';

/** 同一场景的本地化控件与重置基线 */
export const createPreviewControlContract = (lang: Lang) => {
  const text = demoI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: text.title,
    sections: [
      {
        controls: [
          {
            id: 'participation',
            kind: 'select',
            defaultValue: 'exclude',
            label: text.participation,
            options: [
              { value: 'include', label: text.participation0 },
              { value: 'exclude', label: text.participation1 },
            ],
          },
          { id: 'offsetX', kind: 'range', min: -80, max: 140, step: 5, defaultValue: 0, label: text.offsetX },
          { id: 'offsetY', kind: 'range', min: -60, max: 80, step: 5, defaultValue: 0, label: text.offsetY },
          { id: 'zIndex', kind: 'range', min: -1, max: 2, step: 1, defaultValue: 1, label: text.zIndex },
        ],
      },
    ],
  });
  return {
    controls,
    canonicalValues: { participation: 'exclude', offsetX: 0, offsetY: 0, zIndex: 1 },
    relatedApis: ['OverlayLayoutItem.sizeParticipation', 'OverlayLayoutItem.zIndex', 'OverlayLayoutItem.offset'],
  } satisfies PreviewControlContract;
};
/** 中文注册基线 */
export const previewControlContract = createPreviewControlContract('zh');
