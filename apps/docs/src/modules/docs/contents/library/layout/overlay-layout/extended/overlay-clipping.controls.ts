import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { demoI18n } from './overlay-clipping.i18n';
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
            id: 'overflow',
            kind: 'select',
            defaultValue: 'visible',
            label: text.overflow,
            options: [
              { value: 'visible', label: text.overflow0 },
              { value: 'clip', label: text.overflow1 },
            ],
          },
          { id: 'offset', kind: 'range', min: 0, max: 170, step: 1, defaultValue: 100, label: text.offset },
        ],
      },
    ],
  });
  return {
    controls,
    canonicalValues: { overflow: 'visible', offset: 100 },
    relatedApis: ['OverlayLayout.overflow', 'OverlayLayoutItem.offset', 'OverlayLayoutItem.sizeParticipation'],
  } satisfies PreviewControlContract;
};
/** 中文注册基线 */
export const previewControlContract = createPreviewControlContract('zh');
