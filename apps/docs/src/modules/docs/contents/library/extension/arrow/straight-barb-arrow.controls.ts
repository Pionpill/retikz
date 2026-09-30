import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { demoI18n } from './straight-barb-arrow.i18n';

/** 本节端点的本地化控件与重置基线 */
export const createPreviewControlContract = (lang: Lang) => {
  const label = demoI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: label.title,
    sections: [
      {
        label: label.section,
        controls: [
          { id: 'length', kind: 'range', label: label.length, defaultValue: 8, min: 4, max: 22, step: 1 },
          { id: 'width', kind: 'range', label: label.width, defaultValue: 8, min: 4, max: 20, step: 1 },
          { id: 'lineWidth', kind: 'range', label: label.lineWidth, defaultValue: 1.5, min: 0.5, max: 4, step: 0.5 },
          { id: 'color', kind: 'color', label: label.color, defaultValue: '#2563eb' },
        ],
      },
    ],
  });
  return {
    controls,
    canonicalValues: { length: 8, width: 8, lineWidth: 1.5, color: '#2563eb' },
    relatedApis: ['Draw.arrowDetail'],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract('zh');
