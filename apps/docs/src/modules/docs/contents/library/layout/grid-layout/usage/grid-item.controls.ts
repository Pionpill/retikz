import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { demoI18n } from './grid-item.i18n';

/** 同一场景的本地化控件与重置基线 */
export const createPreviewControlContract = (lang: Lang) => {
  const text = demoI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: text.title,
    sections: [
      {
        controls: [
          { id: 'margin', kind: 'range', min: 0, max: 16, step: 1, defaultValue: 4, label: text.margin },
          {
            id: 'justifySelf',
            kind: 'select',
            defaultValue: 'start',
            label: text.justifySelf,
            options: [
              { value: 'start', label: text.justifySelf0 },
              { value: 'center', label: text.justifySelf1 },
              { value: 'end', label: text.justifySelf2 },
              { value: 'stretch', label: text.justifySelf3 },
            ],
          },
          {
            id: 'alignSelf',
            kind: 'select',
            defaultValue: 'start',
            label: text.alignSelf,
            options: [
              { value: 'start', label: text.alignSelf0 },
              { value: 'center', label: text.alignSelf1 },
              { value: 'end', label: text.alignSelf2 },
              { value: 'stretch', label: text.alignSelf3 },
            ],
          },
        ],
      },
    ],
  });

  return {
    controls,
    canonicalValues: { margin: 4, justifySelf: 'start', alignSelf: 'start' },
    relatedApis: ['GridLayoutItem.margin', 'GridLayoutItem.justifySelf', 'GridLayoutItem.alignSelf'],
  } satisfies PreviewControlContract;
};

/** 中文注册基线 */
export const previewControlContract = createPreviewControlContract('zh');
