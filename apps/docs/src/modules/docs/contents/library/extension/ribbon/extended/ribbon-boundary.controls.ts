import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { ribbonBoundaryI18n } from './ribbon-boundary.i18n';

/** 当前语言的边界模式控件与稳定基线 */
export const createPreviewControlContract = (lang: Lang) => {
  const text = ribbonBoundaryI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: text.title,
    sections: [
      {
        controls: [
          { kind: 'range', id: 'lowerOffset', label: text.offset, defaultValue: 0, min: -30, max: 50, step: 5 },
        ],
      },
    ],
  });

  return {
    controls,
    canonicalValues: { lowerOffset: 0 },
    relatedApis: ['Path.kindOptions.lower'],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract('zh');
