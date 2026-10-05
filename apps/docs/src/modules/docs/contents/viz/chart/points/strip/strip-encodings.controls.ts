import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { createPointCoordinateSection } from '../point-coordinate-control';
import { stripEncodingsI18n } from './strip-encodings.i18n';
import { stripVegaBarleyData } from './strip-vega-barley.data';

/** 仅控制当前示例的数据映射 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const i18n = stripEncodingsI18n[lang];
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
              rows: stripVegaBarleyData,
              columns: Object.keys(stripVegaBarleyData[0] ?? {}).map(key => ({ key })),
            },
          ],
        },

        createPointCoordinateSection('coordinateSystem', lang),
        {
          label: i18n.title,
          controls: [
            {
              kind: 'select',
              id: 'role',
              label: i18n.role,
              defaultValue: 'x',
              options: [
                { value: 'x', label: i18n.x },
                { value: 'y', label: i18n.y },
              ],
            },
          ],
        },
      ],
    }),
    canonicalValues: {
      coordinateSystem: 'cartesian2D',
      role: 'x',
    } as const,
    relatedApis: ['StripChart.coordinate', 'StripEncodings.x', 'StripEncodings.y'],
  } satisfies PreviewControlContract;
};
