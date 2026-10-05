import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { demoI18n } from './flex-baseline.i18n';

/** 当前语言的功能控件与稳定基线 */
export const createPreviewControlContract = (lang: Lang) => {
  const text = demoI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: text.title,
    sections: [
      {
        controls: [
          {
            kind: 'select',
            id: 'alignItems',
            label: text.alignItems,
            defaultValue: 'first-baseline',
            options: [
              { value: 'first-baseline', label: text.alignItemsOption0 },
              { value: 'last-baseline', label: text.alignItemsOption1 },
              { value: 'center', label: text.alignItemsOption2 },
            ],
          },
          { kind: 'range', id: 'fontA', label: text.fontA, defaultValue: 18, min: 12, max: 28, step: 1 },
          { kind: 'range', id: 'fontB', label: text.fontB, defaultValue: 28, min: 12, max: 36, step: 1 },
          {
            kind: 'select',
            id: 'alignSelf',
            label: text.alignSelf,
            defaultValue: 'auto',
            options: [
              { value: 'auto', label: text.alignSelfOption0 },
              { value: 'first-baseline', label: text.alignSelfOption1 },
              { value: 'last-baseline', label: text.alignSelfOption2 },
              { value: 'center', label: text.alignSelfOption3 },
            ],
          },
        ],
      },
    ],
  });

  return {
    controls,
    canonicalValues: { alignItems: 'first-baseline', fontA: 18, fontB: 28, alignSelf: 'auto' },
    relatedApis: ['FlexLayout.alignItems', 'FlexLayoutItem.alignSelf', 'Node.style.font.size'],
  } satisfies PreviewControlContract;
};

/** 默认语言的注册契约 */
export const previewControlContract = createPreviewControlContract('zh');
