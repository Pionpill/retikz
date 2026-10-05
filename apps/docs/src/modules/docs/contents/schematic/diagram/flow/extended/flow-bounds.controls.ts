import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { flowBoundsI18n } from './flow-bounds.i18n';

/** 当前语言的 Layout 结构边界面板 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const copy = flowBoundsI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: copy.controlsTitle,
    sections: [
      {
        controls: [
          {
            kind: 'switch',
            id: 'excludeFormats',
            label: copy.excludeFormats,
            defaultValue: true,
          },
        ],
      },
    ],
  });

  return {
    controls,
    canonicalValues: { excludeFormats: true },
    relatedApis: ['FlowLayout.excludeFromBounds'],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract();

export const previewControls = previewControlContract.controls;
