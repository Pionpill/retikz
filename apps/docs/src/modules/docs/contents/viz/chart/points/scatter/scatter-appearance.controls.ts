import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { createPointCoordinateSection } from '../point-coordinate-control';
import { scatterAppearanceI18n } from './scatter-appearance.i18n';
import { fertilityWorkData } from './scatter-fertility-work.data';

/** 固定映射，仅控制散点常量外观 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const i18n = scatterAppearanceI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: i18n.title,
      sections: [
        {
          label: i18n.data,
          defaultCollapsed: true,
          controls: [
            {
              kind: 'table',
              id: 'rows',
              label: i18n.samples,
              rows: fertilityWorkData,
              columns: [
                { key: 'country' },
                { key: 'fertilityRate' },
                { key: 'femaleLaborParticipation' },
                { key: 'incomeGroup' },
              ],
            },
          ],
        },

        createPointCoordinateSection('coordinateSystem', lang),
        {
          label: i18n.points,
          controls: [
            { kind: 'range', id: 'size', label: i18n.size, defaultValue: 8, min: 3, max: 18, step: 1 },
            { kind: 'range', id: 'opacity', label: i18n.opacity, defaultValue: 0.4, min: 0.1, max: 1, step: 0.05 },
            { kind: 'color', id: 'stroke', label: i18n.stroke, defaultValue: '#475569' },
            { kind: 'range', id: 'strokeWidth', label: i18n.strokeWidth, defaultValue: 1.5, min: 0, max: 4, step: 0.5 },
          ],
        },
      ],
    }),
    canonicalValues: {
      coordinateSystem: 'cartesian2D',
      size: 8,
      opacity: 0.4,
      stroke: '#475569',
      strokeWidth: 1.5,
    },
    relatedApis: [
      'ScatterChart.coordinate',
      'ScatterProperties.size',
      'ScatterProperties.opacity',
      'ScatterProperties.stroke',
      'ScatterProperties.strokeWidth',
    ],
  } satisfies PreviewControlContract;
};
