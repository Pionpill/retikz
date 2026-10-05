import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { demoI18n } from './grid-inspection.i18n';

/** 同一场景的本地化控件与重置基线 */
export const createPreviewControlContract = (lang: Lang) => {
  const text = demoI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: text.title,
    sections: [
      {
        controls: [
          { id: 'width', kind: 'range', min: 200, max: 500, step: 1, defaultValue: 350, label: text.width },
          { id: 'slots', kind: 'switch', defaultValue: true, label: text.slots },
          { id: 'allocation', kind: 'switch', defaultValue: true, label: text.allocation },
          { id: 'details', kind: 'switch', defaultValue: true, label: text.details },
        ],
      },
    ],
  });
  return {
    controls,
    canonicalValues: { width: 350, slots: true, allocation: true, details: true },
    relatedApis: ['GridLayout.size', 'GridLayoutInspectOptions.bounds'],
  } satisfies PreviewControlContract;
};
/** 中文注册基线 */
export const previewControlContract = createPreviewControlContract('zh');
