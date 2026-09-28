import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { createPointCoordinateSection } from '../point-coordinate-control';
import { bubbleAppearanceI18n } from './bubble-appearance.i18n';
import { gapminderBubbleData } from './bubble-basic.data';
/** 只提供当前外观示例的相关控件 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const i18n = bubbleAppearanceI18n[lang];
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
              rows: gapminderBubbleData,
              columns: [
                { key: 'country' },
                { key: 'continent' },
                { key: 'gdpPerCapita' },
                { key: 'lifeExpectancy' },
                { key: 'population' },
              ],
            },
          ],
        },

        createPointCoordinateSection('coordinateSystem', lang),
        {
          label: i18n.section,
          controls: [
            {
              kind: 'range',
              id: 'fillOpacity',
              label: i18n.fillOpacity,
              defaultValue: 0.35,
              min: 0.1,
              max: 1,
              step: 0.05,
            },
            { kind: 'color', id: 'stroke', label: i18n.stroke, defaultValue: '#475569' },
            { kind: 'range', id: 'strokeWidth', label: i18n.strokeWidth, defaultValue: 1.5, min: 0, max: 4, step: 0.5 },
            {
              kind: 'select',
              id: 'shape',
              label: i18n.shape,
              defaultValue: 'circle',
              options: [
                { value: 'circle', label: i18n.circle },
                { value: 'rectangle', label: i18n.rectangle },
                { value: 'diamond', label: i18n.diamond },
              ],
            },
          ],
        },
      ],
    }),
    canonicalValues: {
      coordinateSystem: 'cartesian2D',
      fillOpacity: 0.35,
      stroke: '#475569',
      strokeWidth: 1.5,
      shape: 'circle',
    },
    relatedApis: [
      'BubbleChart.coordinate',
      'BubbleProperties.fillOpacity',
      'BubbleProperties.stroke',
      'BubbleProperties.strokeWidth',
      'BubbleProperties.shape',
    ],
  } satisfies PreviewControlContract;
};
