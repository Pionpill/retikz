import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { demoI18n } from './overlay-box.i18n';
/** 同一场景的本地化控件与重置基线 */
export const createPreviewControlContract = (lang: Lang) => {
  const text = demoI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: text.title,
    sections: [
      {
        label: text.title,
        controls: [
          { id: 'width', kind: 'range', min: 200, max: 400, step: 1, defaultValue: 300, label: text.width },
          { id: 'height', kind: 'range', min: 100, max: 210, step: 1, defaultValue: 150, label: text.height },
          { id: 'padding', kind: 'range', min: 0, max: 32, step: 1, defaultValue: 12, label: text.padding },
        ],
      },
    ],
  });
  return {
    controls,
    canonicalValues: { width: 300, height: 150, padding: 12 },
    relatedApis: ['OverlayLayout.size', 'OverlayLayout.padding'],
  } satisfies PreviewControlContract;
};
/** 中文注册基线 */
export const previewControlContract = createPreviewControlContract('zh');
