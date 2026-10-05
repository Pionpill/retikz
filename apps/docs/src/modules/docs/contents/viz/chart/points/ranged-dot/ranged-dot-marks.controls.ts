import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract, PreviewControlValuesFor } from '@/modules/docs/preview';

import { createPointCoordinateSection } from '../point-coordinate-control';
import { rangedDotData } from './ranged-dot-basic.data';
import { controlI18n } from './ranged-dot-marks.i18n';

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
              rows: rangedDotData,
              columns: Object.keys(rangedDotData[0] ?? {}).map(key => ({ key })),
            },
          ],
        },

        createPointCoordinateSection('coordinateSystem', lang),
        {
          label: text.settings,
          controls: [
            {
              kind: 'select',
              id: 'shape',
              label: text.shape,
              defaultValue: 'diamond',
              options: [
                { value: 'circle', label: text.shape_circle },
                { value: 'diamond', label: text.shape_diamond },
                { value: 'rectangle', label: text.shape_rectangle },
              ],
            },
            { kind: 'range', id: 'endSize', label: text.endSize, defaultValue: 7, min: 2, max: 14, step: 1 },
            { kind: 'range', id: 'strokeWidth', label: text.strokeWidth, defaultValue: 2, min: 0.5, max: 5, step: 0.5 },
          ],
        },
      ],
    }),
    canonicalValues: {
      coordinateSystem: 'cartesian2D',
      shape: 'diamond',
      endSize: 7,
      strokeWidth: 2,
    } as const,
    relatedApis: ['RangedDotChart.coordinate', 'RangedDotMark.properties'],
  } satisfies PreviewControlContract;
};

/** 当前示例的控件值 */
export type DemoValues = PreviewControlValuesFor<ReturnType<typeof createPreviewControlContract>['controls']>;
