import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract, PreviewControlValuesFor } from '@/modules/docs/preview';

import { createPointCoordinateSection } from '../point-coordinate-control';
import { controlI18n } from './scatter-marks.i18n';
import { scatterMinimalData } from './scatter-minimal.data';

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
              rows: scatterMinimalData,
              columns: Object.keys(scatterMinimalData[0] ?? {}).map(key => ({ key })),
            },
          ],
        },

        createPointCoordinateSection('coordinateSystem', lang),
        {
          label: text.settings,
          controls: [
            { kind: 'range', id: 'size', label: text.size, defaultValue: 3, min: 1, max: 12, step: 1 },
            { kind: 'range', id: 'opacity', label: text.opacity, defaultValue: 1, min: 0.1, max: 1, step: 0.05 },
          ],
        },
      ],
    }),
    canonicalValues: {
      coordinateSystem: 'cartesian2D',
      size: 3,
      opacity: 1,
    } as const,
    relatedApis: ['ScatterChart.coordinate', 'ScatterMark.properties'],
  } satisfies PreviewControlContract;
};

/** 当前示例的控件值 */
export type DemoValues = PreviewControlValuesFor<ReturnType<typeof createPreviewControlContract>['controls']>;
