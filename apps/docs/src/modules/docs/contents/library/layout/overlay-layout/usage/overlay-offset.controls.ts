import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { demoI18n } from './overlay-offset.i18n';
/** 同一场景的本地化控件与重置基线 */
export const createPreviewControlContract = (lang: Lang) => {
  const text = demoI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: text.title,
    sections: [
      {
        label: text.title,
        controls: [
          { id: 'x', kind: 'range', min: -80, max: 80, step: 1, defaultValue: 30, label: text.x },
          { id: 'y', kind: 'range', min: -50, max: 50, step: 1, defaultValue: 25, label: text.y },
          {
            id: 'alignSelf',
            kind: 'select',
            defaultValue: 'center',
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
    canonicalValues: { x: 30, y: 25, alignSelf: 'center' },
    relatedApis: ['OverlayLayoutItem.offset', 'OverlayLayoutItem.alignSelf'],
  } satisfies PreviewControlContract;
};
/** 中文注册基线 */
export const previewControlContract = createPreviewControlContract('zh');
