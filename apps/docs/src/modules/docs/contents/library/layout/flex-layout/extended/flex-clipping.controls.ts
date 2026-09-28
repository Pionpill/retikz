import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { demoI18n } from './flex-clipping.i18n';

/** 当前语言的功能控件与稳定基线 */
export const createPreviewControlContract = (lang: Lang) => {
  const text = demoI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: text.title,
    sections: [
      {
        label: text.title,
        controls: [
          {
            kind: 'select',
            id: 'overflow',
            label: text.overflow,
            defaultValue: 'visible',
            options: [
              { value: 'visible', label: text.overflowOption0 },
              { value: 'clip', label: text.overflowOption1 },
            ],
          },
          { kind: 'range', id: 'width', label: text.width, defaultValue: 180, min: 120, max: 260, step: 1 },
          { kind: 'range', id: 'childWidth', label: text.childWidth, defaultValue: 240, min: 160, max: 300, step: 1 },
          { kind: 'range', id: 'basis', label: text.basis, defaultValue: 100, min: 80, max: 160, step: 1 },
        ],
      },
    ],
  });
  return {
    controls,
    canonicalValues: { overflow: 'visible', width: 180, childWidth: 240, basis: 100 },
    relatedApis: ['FlexLayout.overflow', 'FlexLayout.size', 'FlexLayoutItem.basis', 'Node.layout.minimumSize'],
  } satisfies PreviewControlContract;
};
/** 默认语言的注册契约 */
export const previewControlContract = createPreviewControlContract('zh');
