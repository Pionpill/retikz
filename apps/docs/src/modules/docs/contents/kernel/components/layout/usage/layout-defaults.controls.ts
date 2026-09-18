import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { layoutDefaultsI18n } from './layout-defaults.i18n';

/** 全图默认值的双语控件与稳定初始状态 */
export const createPreviewControlContract = (lang: Lang) => {
  const text = layoutDefaultsI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      defaultSize: 50,
      title: text.title,
      sections: [
        {
          label: text.shared,
          controls: [
            { kind: 'color', id: 'stroke', label: text.stroke, defaultValue: '#3b82f6' },
            { kind: 'range', id: 'strokeWidth', label: text.strokeWidth, defaultValue: 2, min: 1, max: 8, step: 1 },
            { kind: 'range', id: 'opacity', label: text.opacity, defaultValue: 1, min: 0.2, max: 1, step: 0.1 },
          ],
        },
        {
          label: text.node,
          controls: [
            { kind: 'color', id: 'fill', label: text.fill, defaultValue: '#dbeafe' },
            { kind: 'range', id: 'padding', label: text.padding, defaultValue: 12, min: 4, max: 24, step: 2 },
          ],
        },
      ],
    }),
    canonicalValues: { stroke: '#3b82f6', strokeWidth: 2, opacity: 1, fill: '#dbeafe', padding: 12 },
    relatedApis: ['Layout.rootScope'],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract('zh');
