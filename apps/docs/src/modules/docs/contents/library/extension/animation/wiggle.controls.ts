import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { demoI18n } from './wiggle.i18n';

/** 当前动画效果的本地化控件与重置基线 */
export const createPreviewControlContract = (lang: Lang) => {
  const label = demoI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: label.title,
    sections: [
      {
        controls: [
          { id: 'duration', kind: 'range', label: label.duration, defaultValue: 500, min: 200, max: 1800, step: 100 },
          { id: 'angle', kind: 'range', label: label.extra, defaultValue: 12, min: 2, max: 25, step: 1 },
        ],
      },
    ],
  });

  return {
    controls,
    canonicalValues: { duration: 500, angle: 12 },
    relatedApis: ['wiggle', 'AnimationTrack.duration'],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract('zh');
