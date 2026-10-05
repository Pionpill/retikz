import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract, PreviewControlValuesFor } from '@/modules/docs/preview';

import { createPointCoordinateSection } from '../point-coordinate-control';
import { connectedScatterData } from './connected-scatter-basic.data';
import { controlI18n } from './connected-scatter-marks.i18n';

/** 示例属性的双语交互契约 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const text = controlI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: text.settings,
      sections: [
        {
          label: text.data,
          defaultCollapsed: true,
          controls: [
            {
              kind: 'table',
              id: 'rows',
              label: text.samples,
              rows: connectedScatterData,
              columns: Object.keys(connectedScatterData[0] ?? {}).map(key => ({ key })),
            },
          ],
        },

        createPointCoordinateSection('coordinateSystem', lang),
        {
          label: text.settings,
          controls: [
            {
              kind: 'range',
              id: 'fillOpacity',
              label: text.fillOpacity,
              defaultValue: 0.1,
              min: 0,
              max: 1,
              step: 0.05,
            },
            { kind: 'range', id: 'strokeWidth', label: text.strokeWidth, defaultValue: 2, min: 0.5, max: 5, step: 0.5 },
            { kind: 'switch', id: 'dashed', label: text.dashed, defaultValue: true },
            { kind: 'range', id: 'size', label: text.size, defaultValue: 4, min: 1, max: 12, step: 1 },
          ],
        },
      ],
    }),
    canonicalValues: {
      coordinateSystem: 'cartesian2D',
      fillOpacity: 0.1,
      strokeWidth: 2,
      dashed: true,
      size: 4,
    } as const,
    relatedApis: ['ConnectedScatterChart.coordinate', 'ConnectedScatterMark.properties'],
  } satisfies PreviewControlContract;
};

/** 当前示例的控件值 */
export type DemoValues = PreviewControlValuesFor<ReturnType<typeof createPreviewControlContract>['controls']>;
