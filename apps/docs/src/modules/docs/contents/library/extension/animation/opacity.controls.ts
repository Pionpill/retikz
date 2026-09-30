import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { demoI18n } from './opacity.i18n';

/** 当前动画效果的本地化控件与重置基线 */
export const createPreviewControlContract = (lang: Lang) => {
  const label = demoI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: label.title,
    sections: [
      {
        controls: [
          {
            id: 'effect',
            kind: 'select',
            label: label.effect,
            defaultValue: 'flash',
            options: [
              { value: 'flash', label: label.first },
              { value: 'blink', label: label.second },
            ],
          },
          { id: 'duration', kind: 'range', label: label.duration, defaultValue: 500, min: 200, max: 1800, step: 100 },
          { id: 'dim', kind: 'range', label: label.extra, defaultValue: 0, min: 0, max: 0.8, step: 0.1 },
        ],
      },
    ],
  });
  return {
    controls,
    canonicalValues: { effect: 'flash', duration: 500, dim: 0 },
    relatedApis: ['flash', 'blink', 'AnimationTrack.duration'],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract('zh');
