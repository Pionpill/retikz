import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { arraySkeletonI18n } from './array-skeleton.i18n';

/** 按语言生成骨架 controls */
const createControls = (lang: Lang) => {
  const t = arraySkeletonI18n[lang];
  return definePreviewControls({
    presentation: 'panel',
    title: t.title,
    sections: [
      {
        controls: [
          {
            kind: 'select',
            id: 'mode',
            label: t.mode,
            defaultValue: 'labels',
            options: [
              { value: 'count', label: t.empty },
              { value: 'labels', label: t.symbols },
            ],
          },
          {
            kind: 'range',
            id: 'count',
            label: t.count,
            defaultValue: 4,
            min: 0,
            max: 6,
            step: 1,
            visibleWhen: { controlId: 'mode', oneOf: ['count'] },
          },
          {
            kind: 'text',
            id: 'labels',
            label: t.labels,
            defaultValue: 'x₁|x₂||xₙ',
            visibleWhen: { controlId: 'mode', oneOf: ['labels'] },
          },
          {
            kind: 'select',
            id: 'index',
            label: t.index,
            defaultValue: 'auto',
            options: [
              { value: 'none', label: t.none },
              { value: 'auto', label: t.auto },
              { value: 'labels', label: t.custom },
            ],
          },
        ],
      },
    ],
  });
};
/** 控件与源码共享的稳定契约 */
export const createPreviewControlContract = (lang: Lang) =>
  ({
    controls: createControls(lang),
    canonicalValues: { mode: 'labels', count: 4, labels: 'x₁|x₂||xₙ', index: 'auto' },
    relatedApis: ['Array.skeleton', 'Array.index'],
  }) satisfies PreviewControlContract;
/** 默认语言契约 */
export const previewControlContract = createPreviewControlContract('zh');
