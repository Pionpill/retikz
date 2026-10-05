import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { flowGridI18n } from './flow-grid.i18n';

/** 当前语言的 Grid 轨道面板 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const copy = flowGridI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: copy.title,
    sections: [
      {
        controls: [
          { kind: 'range', id: 'row', label: copy.rowGap, defaultValue: 32, min: 0, max: 80, step: 8 },
          { kind: 'range', id: 'column', label: copy.columnGap, defaultValue: 48, min: 0, max: 96, step: 8 },
          { kind: 'switch', id: 'reserveLabelSpace', label: copy.reserveLabelSpace, defaultValue: true },
        ],
      },
    ],
  });

  return {
    controls,
    canonicalValues: { row: 32, column: 48, reserveLabelSpace: true },
    relatedApis: ['FlowLayout.gap', 'FlowLayout.reserveLabelSpace'],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract();

export const previewControls = previewControlContract.controls;
