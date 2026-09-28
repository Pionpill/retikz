import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { demoI18n } from './grid-implicit.i18n';
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
          { id: 'start', kind: 'range', min: 0, max: 3, step: 1, defaultValue: 2, label: text.start },
          { id: 'height', kind: 'range', min: 40, max: 80, step: 1, defaultValue: 52, label: text.height },
          {
            id: 'autoFlow',
            kind: 'select',
            defaultValue: 'row',
            label: text.autoFlow,
            options: [
              { value: 'row', label: text.autoFlow0 },
              { value: 'column', label: text.autoFlow1 },
            ],
          },
        ],
      },
    ],
  });
  return {
    controls,
    canonicalValues: { start: 2, height: 52, autoFlow: 'row' },
    relatedApis: ['GridLayoutItem.row', 'GridLayoutItem.column', 'GridLayout.implicitRow', 'GridLayout.autoFlow'],
  } satisfies PreviewControlContract;
};
/** 中文注册基线 */
export const previewControlContract = createPreviewControlContract('zh');
