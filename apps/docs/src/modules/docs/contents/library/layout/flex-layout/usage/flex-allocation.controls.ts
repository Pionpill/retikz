import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { demoI18n } from './flex-allocation.i18n';

/** 当前语言的功能控件与稳定基线 */
export const createPreviewControlContract = (lang: Lang) => {
  const text = demoI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: text.title,
    sections: [
      {
        controls: [
          { kind: 'range', id: 'width', label: text.width, defaultValue: 350, min: 200, max: 500, step: 1 },
          { kind: 'range', id: 'basis', label: text.basis, defaultValue: 64, min: 40, max: 100, step: 1 },
          { kind: 'range', id: 'grow', label: text.grow, defaultValue: 1, min: 0, max: 3, step: 1 },
          { kind: 'range', id: 'shrink', label: text.shrink, defaultValue: 1, min: 0, max: 3, step: 1 },
        ],
      },
    ],
  });

  return {
    controls,
    canonicalValues: { width: 350, basis: 64, grow: 1, shrink: 1 },
    relatedApis: ['FlexLayout.size', 'FlexLayoutItem.basis', 'FlexLayoutItem.grow', 'FlexLayoutItem.shrink'],
  } satisfies PreviewControlContract;
};

/** 默认语言的注册契约 */
export const previewControlContract = createPreviewControlContract('zh');
