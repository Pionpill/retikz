import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { createPointCoordinateSection } from '../point-coordinate-control';
import { gapminderBubbleData } from './bubble-basic.data';
import { bubbleEncodingsI18n } from './bubble-encodings.i18n';
/** 只提供当前映射示例的相关控件 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const i18n = bubbleEncodingsI18n[lang];
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
          controls: [{ kind: 'switch', id: 'color', label: i18n.color, defaultValue: true }],
        },
      ],
    }),
    canonicalValues: {
      coordinateSystem: 'cartesian2D',
      color: true,
    },
    relatedApis: ['BubbleChart.coordinate', 'BubbleEncodings.color'],
  } satisfies PreviewControlContract;
};
