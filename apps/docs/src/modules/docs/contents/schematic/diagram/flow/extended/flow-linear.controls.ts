import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { flowLinearI18n } from './flow-linear.i18n';

/** 建立线性 Layout 的双语 controls 契约 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const copy = flowLinearI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: copy.title,
    sections: [
      {
        controls: [
          {
            kind: 'select',
            id: 'direction',
            label: copy.directionLabel,
            defaultValue: 'right',
            options: copy.directionOptions,
          },
          { kind: 'range', id: 'gap', label: copy.gapLabel, defaultValue: 32, min: 0, max: 48, step: 8 },
        ],
      },
    ],
  });

  return {
    controls,
    canonicalValues: { direction: 'right', gap: 32 },
    relatedApis: ['FlowLayout.direction', 'FlowLayout.gap'],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract();

export const previewControls = previewControlContract.controls;
