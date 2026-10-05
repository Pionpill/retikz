import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { demoI18n } from './flex-geometry.i18n';

/** 当前语言的功能控件与稳定基线 */
export const createPreviewControlContract = (lang: Lang) => {
  const text = demoI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: text.title,
    sections: [
      {
        controls: [
          {
            kind: 'select',
            id: 'direction',
            label: text.direction,
            defaultValue: 'row',
            options: [
              { value: 'row', label: text.directionOption0 },
              { value: 'column', label: text.directionOption1 },
            ],
          },
          {
            kind: 'select',
            id: 'widthMode',
            label: text.widthMode,
            defaultValue: 'fixed',
            options: [
              { value: 'content', label: text.widthModeOption0 },
              { value: 'fixed', label: text.widthModeOption1 },
            ],
          },
          {
            kind: 'range',
            id: 'width',
            label: text.width,
            defaultValue: 280,
            min: 180,
            max: 300,
            step: 1,
            visibleWhen: { controlId: 'widthMode', oneOf: ['fixed'] },
          },
          {
            kind: 'select',
            id: 'heightMode',
            label: text.heightMode,
            defaultValue: 'content',
            options: [
              { value: 'content', label: text.heightModeOption0 },
              { value: 'fixed', label: text.heightModeOption1 },
            ],
          },
          {
            kind: 'range',
            id: 'height',
            label: text.height,
            defaultValue: 180,
            min: 140,
            max: 240,
            step: 1,
            visibleWhen: { controlId: 'heightMode', oneOf: ['fixed'] },
          },
          { kind: 'range', id: 'padding', label: text.padding, defaultValue: 12, min: 0, max: 20, step: 1 },
          { kind: 'range', id: 'gap', label: text.gap, defaultValue: 8, min: 0, max: 20, step: 1 },
        ],
      },
    ],
  });

  return {
    controls,
    canonicalValues: {
      direction: 'row',
      widthMode: 'fixed',
      width: 280,
      heightMode: 'content',
      height: 180,
      padding: 12,
      gap: 8,
    },
    relatedApis: ['FlexLayout.direction', 'FlexLayout.size', 'FlexLayout.padding', 'FlexLayout.gap'],
  } satisfies PreviewControlContract;
};

/** 默认语言的注册契约 */
export const previewControlContract = createPreviewControlContract('zh');
