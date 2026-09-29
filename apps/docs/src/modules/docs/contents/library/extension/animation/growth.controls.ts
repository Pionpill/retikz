import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { demoI18n } from './growth.i18n';

/** 当前动画效果的本地化控件与重置基线 */
export const createPreviewControlContract = (lang: Lang) => {
  const label = demoI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: label.title,
    sections: [
      {
        label: label.section,
        controls: [
          {
            id: 'effect',
            kind: 'select',
            label: label.effect,
            defaultValue: 'grow',
            options: [
              { value: 'grow', label: label.first },
              { value: 'growUp', label: label.second },
            ],
          },
          { id: 'duration', kind: 'range', label: label.duration, defaultValue: 500, min: 200, max: 1800, step: 100 },
          {
            id: 'origin',
            kind: 'select',
            label: label.extra,
            defaultValue: 'bottom',
            options: [
              { value: 'center', label: label.opt0 },
              { value: 'bottom', label: label.opt1 },
            ],
          },
        ],
      },
    ],
  });
  return {
    controls,
    canonicalValues: { effect: 'grow', duration: 500, origin: 'bottom' },
    relatedApis: ['grow', 'growUp', 'AnimationTrack.duration'],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract('zh');
