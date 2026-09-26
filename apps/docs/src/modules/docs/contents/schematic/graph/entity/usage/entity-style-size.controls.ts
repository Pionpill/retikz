import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { entityStyleSizeI18n } from './entity-style-size.i18n';

/** 样式与尺寸试验场的控件契约 */
export const createPreviewControlContract = (lang: Lang) => {
  const copy = entityStyleSizeI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: copy.title,
    sections: [
      {
        label: copy.style,
        controls: [
          { kind: 'color', id: 'color', label: copy.color, defaultValue: '#2563eb' },
          { kind: 'range', id: 'fill', label: copy.fill, defaultValue: 0.12, min: 0, max: 0.6, step: 0.04 },
          { kind: 'range', id: 'strokeWidth', label: copy.strokeWidth, defaultValue: 2, min: 1, max: 6, step: 0.5 },
        ],
      },
      {
        label: copy.size,
        controls: [
          {
            kind: 'range',
            id: 'maxTextWidth',
            label: copy.maxTextWidth,
            defaultValue: 140,
            min: 80,
            max: 260,
            step: 10,
          },
          { kind: 'range', id: 'lineHeight', label: copy.lineHeight, defaultValue: 18, min: 14, max: 30, step: 2 },
          {
            kind: 'range',
            id: 'minimumWidth',
            label: copy.minimumWidth,
            defaultValue: 160,
            min: 80,
            max: 300,
            step: 10,
          },
        ],
      },
    ],
  });
  return {
    controls,
    canonicalValues: {
      color: '#2563eb',
      fill: 0.12,
      strokeWidth: 2,
      maxTextWidth: 140,
      lineHeight: 18,
      minimumWidth: 160,
    },
    relatedApis: [
      'Entity.style.color',
      'Entity.style.fill',
      'Entity.style.strokeWidth',
      'Entity.layout.maxTextWidth',
      'Entity.layout.lineHeight',
      'Entity.layout.minimumSize',
    ],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract('zh');
