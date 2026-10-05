import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { demoI18n } from './continuous.i18n';

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
            defaultValue: 'pulse',
            options: [
              { value: 'pulse', label: label.first },
              { value: 'spin', label: label.second },
            ],
          },
          { id: 'duration', kind: 'range', label: label.duration, defaultValue: 1000, min: 200, max: 1800, step: 100 },
          {
            id: 'peak',
            kind: 'range',
            label: label.extra,
            defaultValue: 1.3,
            min: 1.05,
            max: 1.8,
            step: 0.05,
            visibleWhen: { controlId: 'effect', oneOf: ['pulse'] },
          },
        ],
      },
    ],
  });

  return {
    controls,
    canonicalValues: { effect: 'pulse', duration: 1000, peak: 1.3 },
    relatedApis: ['pulse', 'spin', 'AnimationTrack.duration'],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract('zh');
