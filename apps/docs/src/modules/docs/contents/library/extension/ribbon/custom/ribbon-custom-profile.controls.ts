import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { ribbonCustomProfileI18n } from './ribbon-custom-profile.i18n';

/** 当前语言的自定义 profile 参数控件与稳定基线 */
export const createPreviewControlContract = (lang: Lang) => {
  const text = ribbonCustomProfileI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: text.title,
    sections: [
      {
        label: text.title,
        controls: [
          { kind: 'range', id: 'base', label: text.base, defaultValue: 10, min: 2, max: 28, step: 2 },
          { kind: 'range', id: 'peak', label: text.peak, defaultValue: 42, min: 12, max: 80, step: 2 },
        ],
      },
    ],
  });
  return {
    controls,
    canonicalValues: { base: 10, peak: 42 },
    relatedApis: ['Path.kindOptions.width.params'],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract('zh');
