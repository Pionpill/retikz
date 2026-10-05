import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { demoI18n } from './grid-overlap.i18n';

/** 同一场景的本地化控件与重置基线 */
export const createPreviewControlContract = (lang: Lang) => {
  const text = demoI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: text.title,
    sections: [
      {
        controls: [
          { id: 'overlap', kind: 'switch', defaultValue: false, label: text.overlap },
          {
            id: 'overflow',
            kind: 'select',
            defaultValue: 'visible',
            label: text.overflow,
            options: [
              { value: 'visible', label: text.overflow0 },
              { value: 'clip', label: text.overflow1 },
            ],
          },
        ],
      },
    ],
  });

  return {
    controls,
    canonicalValues: { overlap: false, overflow: 'visible' },
    relatedApis: ['GridLayout.overlap', 'GridLayout.overflow', 'GridLayoutItem.column', 'GridLayoutItem.row'],
  } satisfies PreviewControlContract;
};

/** 中文注册基线 */
export const previewControlContract = createPreviewControlContract('zh');
