import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { oneDimensionalEvents } from './coordinate-1d-playground.data';
import { coordinate1DPolarI18n } from './coordinate-1d-polar.i18n';

/** 一维投影的双语控件契约 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const text = coordinate1DPolarI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: text.title,
      sections: [
        {
          label: text.data,
          defaultCollapsed: true,
          controls: [
            { kind: 'table', id: 'rows', label: text.events, rows: oneDimensionalEvents, columns: [{ key: 'hour' }] },
          ],
        },
        {
          label: text.projection,
          controls: [
            { kind: 'range', id: 'radius', label: text.radius, defaultValue: 1, min: 0.5, max: 1, step: 0.05 },
            { kind: 'range', id: 'startAngle', label: text.startAngle, defaultValue: 0, min: -180, max: 180, step: 15 },
            { kind: 'range', id: 'sweepAngle', label: text.sweepAngle, defaultValue: 360, min: 90, max: 360, step: 15 },
          ],
        },
      ],
    }),
    canonicalValues: { radius: 1, startAngle: 0, sweepAngle: 360 } as const,
    relatedApis: ['Plot.coordinate.radius', 'Plot.coordinate.startAngle', 'Plot.coordinate.endAngle'],
  } satisfies PreviewControlContract;
};
