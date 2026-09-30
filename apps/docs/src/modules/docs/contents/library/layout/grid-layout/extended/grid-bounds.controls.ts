import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { demoI18n } from './grid-bounds.i18n';
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
            id: 'mode',
            kind: 'select',
            defaultValue: 'natural',
            label: text.mode,
            options: [
              { value: 'minimum', label: text.mode0 },
              { value: 'natural', label: text.mode1 },
            ],
          },
          { id: 'minimum', kind: 'range', min: 40, max: 100, step: 1, defaultValue: 70, label: text.minimum },
          { id: 'maximum', kind: 'range', min: 110, max: 250, step: 1, defaultValue: 160, label: text.maximum },
          { id: 'childWidth', kind: 'range', min: 40, max: 240, step: 1, defaultValue: 220, label: text.childWidth },
          { id: 'width', kind: 'range', min: 240, max: 500, step: 1, defaultValue: 350, label: text.width },
        ],
      },
    ],
  });
  return {
    controls,
    canonicalValues: { mode: 'natural', minimum: 70, maximum: 160, childWidth: 220, width: 350 },
    relatedApis: ['GridLayout.columns', 'GridLayout.size', 'Node.layout.minimumSize'],
  } satisfies PreviewControlContract;
};
/** 中文注册基线 */
export const previewControlContract = createPreviewControlContract('zh');
