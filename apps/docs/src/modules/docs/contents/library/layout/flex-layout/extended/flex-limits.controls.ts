import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { demoI18n } from './flex-limits.i18n';

/** 当前语言的功能控件与稳定基线 */
export const createPreviewControlContract = (lang: Lang) => {
  const text = demoI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: text.title,
    sections: [
      {
        controls: [
          { kind: 'range', id: 'width', label: text.width, defaultValue: 280, min: 180, max: 300, step: 1 },
          { kind: 'range', id: 'basis', label: text.basis, defaultValue: 80, min: 60, max: 120, step: 1 },
          { kind: 'range', id: 'grow', label: text.grow, defaultValue: 2, min: 0, max: 3, step: 1 },
          { kind: 'range', id: 'shrink', label: text.shrink, defaultValue: 1, min: 0, max: 3, step: 1 },
          { kind: 'range', id: 'min', label: text.min, defaultValue: 40, min: 30, max: 70, step: 1 },
          { kind: 'range', id: 'max', label: text.max, defaultValue: 120, min: 80, max: 160, step: 1 },
        ],
      },
    ],
  });

  return {
    controls,
    canonicalValues: { width: 280, basis: 80, grow: 2, shrink: 1, min: 40, max: 120 },
    relatedApis: [
      'FlexLayout.size',
      'FlexLayoutItem.basis',
      'FlexLayoutItem.grow',
      'FlexLayoutItem.shrink',
      'FlexLayoutItem.min',
      'FlexLayoutItem.max',
    ],
  } satisfies PreviewControlContract;
};

/** 默认语言的注册契约 */
export const previewControlContract = createPreviewControlContract('zh');
