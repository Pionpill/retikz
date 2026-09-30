import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { flowItemWidthI18n } from './flow-item-width.i18n';

/** 建立当前语言的 itemWidth 控件契约 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const copy = flowItemWidthI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: copy.title,
    sections: [
      {
        controls: [
          {
            kind: 'select',
            id: 'direction',
            label: copy.direction,
            defaultValue: 'down',
            options: copy.directionOptions,
          },
          {
            kind: 'select',
            id: 'widthMode',
            label: copy.widthMode,
            defaultValue: 'match-largest',
            options: [
              { value: 'natural', label: copy.natural },
              { value: 'match-largest', label: copy.matchLargest },
              { value: 'fixed', label: copy.fixed },
            ],
          },
          {
            kind: 'range',
            id: 'width',
            label: copy.width,
            defaultValue: 160,
            min: 100,
            max: 200,
            step: 20,
            visibleWhen: { controlId: 'widthMode', oneOf: ['fixed'] },
          },
        ],
      },
    ],
  });
  return {
    controls,
    canonicalValues: { direction: 'down', widthMode: 'match-largest', width: 160 },
    relatedApis: ['FlowLayout.direction', 'FlowLayout.itemWidth'],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract();
export const previewControls = previewControlContract.controls;
