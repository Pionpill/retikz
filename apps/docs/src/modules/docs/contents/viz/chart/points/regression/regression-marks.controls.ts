import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract, PreviewControlValuesFor } from '@/modules/docs/preview';

import { createPointCoordinateSection } from '../point-coordinate-control';
import { irisRegressionData } from './regression-basic.data';
import { controlI18n } from './regression-marks.i18n';

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
              rows: irisRegressionData,
              columns: Object.keys(irisRegressionData[0] ?? {}).map(key => ({ key })),
            },
          ],
        },

        createPointCoordinateSection('coordinateSystem', lang),
        {
          label: text.settings,
          controls: [
            {
              kind: 'select',
              id: 'method',
              label: text.method,
              defaultValue: 'quadratic',
              options: [
                { value: 'linear', label: text.method_linear },
                { value: 'quadratic', label: text.method_quadratic },
              ],
            },
            { kind: 'range', id: 'strokeWidth', label: text.strokeWidth, defaultValue: 3, min: 0.5, max: 5, step: 0.5 },
            { kind: 'range', id: 'size', label: text.size, defaultValue: 4, min: 1, max: 12, step: 1 },
            { kind: 'range', id: 'opacity', label: text.opacity, defaultValue: 0.45, min: 0.1, max: 1, step: 0.05 },
          ],
        },
      ],
    }),
    canonicalValues: {
      coordinateSystem: 'cartesian2D',
      method: 'quadratic',
      strokeWidth: 3,
      size: 4,
      opacity: 0.45,
    } as const,
    relatedApis: ['RegressionChart.coordinate', 'RegressionMark.properties'],
  } satisfies PreviewControlContract;
};
/** 当前示例的控件值 */
export type DemoValues = PreviewControlValuesFor<ReturnType<typeof createPreviewControlContract>['controls']>;
