import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { createPointCoordinateSection } from '../point-coordinate-control';
import { connectedScatterData } from './connected-scatter-basic.data';
import { connectedScatterEncodingsI18n } from './connected-scatter-encodings.i18n';
/** 仅控制当前示例的数据映射 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const i18n = connectedScatterEncodingsI18n[lang];
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
              rows: connectedScatterData,
              columns: Object.keys(connectedScatterData[0] ?? {}).map(key => ({ key })),
            },
          ],
        },

        createPointCoordinateSection('coordinateSystem', lang),
      ],
    }),
    canonicalValues: {
      coordinateSystem: 'cartesian2D',
    },
    relatedApis: ['ConnectedScatterChart.coordinate', 'ConnectedScatterEncodings.series'],
  } satisfies PreviewControlContract;
};
