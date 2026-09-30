import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { demoI18n } from './grid-placement.i18n';
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
            id: 'autoFlow',
            kind: 'select',
            defaultValue: 'row',
            label: text.autoFlow,
            options: [
              { value: 'row', label: text.autoFlow0 },
              { value: 'column', label: text.autoFlow1 },
            ],
          },
          { id: 'span', kind: 'range', min: 1, max: 2, step: 1, defaultValue: 1, label: text.span },
        ],
      },
    ],
  });
  return {
    controls,
    canonicalValues: { autoFlow: 'row', span: 1 },
    relatedApis: ['GridLayout.autoFlow', 'GridLayout.rows', 'GridLayoutItem.column', 'GridLayoutItem.row'],
  } satisfies PreviewControlContract;
};
/** 中文注册基线 */
export const previewControlContract = createPreviewControlContract('zh');
