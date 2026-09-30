import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { demoI18n } from './overlay-alignment.i18n';
/** 同一场景的本地化控件与重置基线 */
export const createPreviewControlContract = (lang: Lang) => {
  const text = demoI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: text.title,
    sections: [
      {
        controls: [
          {
            id: 'justifyItems',
            kind: 'select',
            defaultValue: 'center',
            label: text.justifyItems,
            options: [
              { value: 'start', label: text.justifyItems0 },
              { value: 'center', label: text.justifyItems1 },
              { value: 'end', label: text.justifyItems2 },
            ],
          },
          {
            id: 'justifySelf',
            kind: 'select',
            defaultValue: 'auto',
            label: text.justifySelf,
            options: [
              { value: 'auto', label: text.inherit },
              { value: 'start', label: text.justifySelf0 },
              { value: 'center', label: text.justifySelf1 },
              { value: 'end', label: text.justifySelf2 },
            ],
          },
        ],
      },
    ],
  });
  return {
    controls,
    canonicalValues: { justifyItems: 'center', justifySelf: 'auto' },
    relatedApis: ['OverlayLayout.justifyItems', 'OverlayLayoutItem.justifySelf'],
  } satisfies PreviewControlContract;
};
/** 中文注册基线 */
export const previewControlContract = createPreviewControlContract('zh');
