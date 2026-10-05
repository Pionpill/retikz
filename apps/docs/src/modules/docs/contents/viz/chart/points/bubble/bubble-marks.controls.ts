import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract, PreviewControlValuesFor } from '@/modules/docs/preview';

import { createPointCoordinateSection } from '../point-coordinate-control';
import { gapminderBubbleData } from './bubble-basic.data';
import { controlI18n } from './bubble-marks.i18n';

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
              rows: gapminderBubbleData,
              columns: Object.keys(gapminderBubbleData[0] ?? {}).map(key => ({ key })),
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
              defaultValue: 0.15,
              min: 0,
              max: 1,
              step: 0.05,
            },
            { kind: 'range', id: 'strokeWidth', label: text.strokeWidth, defaultValue: 2, min: 0.5, max: 5, step: 0.5 },
          ],
        },
      ],
    }),
    canonicalValues: {
      coordinateSystem: 'cartesian2D',
      fillOpacity: 0.15,
      strokeWidth: 2,
    } as const,
    relatedApis: ['BubbleChart.coordinate', 'BubbleMark.properties'],
  } satisfies PreviewControlContract;
};
/** 当前示例的控件值 */
export type DemoValues = PreviewControlValuesFor<ReturnType<typeof createPreviewControlContract>['controls']>;
