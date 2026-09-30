import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { demoI18n } from './overlay-position.i18n';
/** 同一场景的本地化控件与重置基线 */
export const createPreviewControlContract = (lang: Lang) => {
  const text = demoI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: text.title,
    sections: [
      {
        controls: [
          { id: 'x', kind: 'range', min: 30, max: 240, step: 1, defaultValue: 180, label: text.x },
          { id: 'y', kind: 'range', min: 20, max: 110, step: 1, defaultValue: 50, label: text.y },
          {
            id: 'anchor',
            kind: 'select',
            defaultValue: 'right',
            label: text.anchor,
            options: [
              { value: 'left', label: text.anchor0 },
              { value: 'center', label: text.anchor1 },
              { value: 'right', label: text.anchor2 },
            ],
          },
          { id: 'width', kind: 'range', min: 80, max: 180, step: 1, defaultValue: 120, label: text.width },
        ],
      },
    ],
  });
  return {
    controls,
    canonicalValues: { x: 180, y: 50, anchor: 'right', width: 120 },
    relatedApis: ['OverlayLayoutItem.placement'],
  } satisfies PreviewControlContract;
};
/** 中文注册基线 */
export const previewControlContract = createPreviewControlContract('zh');
