import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { createPointCoordinateSection } from '../point-coordinate-control';
import { irisRegressionData } from './regression-basic.data';
import { regressionEncodingsI18n } from './regression-encodings.i18n';
/** 仅控制当前示例的数据映射 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const i18n = regressionEncodingsI18n[lang];
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
              rows: irisRegressionData,
              columns: Object.keys(irisRegressionData[0] ?? {}).map(key => ({ key })),
            },
          ],
        },

        createPointCoordinateSection('coordinateSystem', lang),
        { label: i18n.title, controls: [{ kind: 'switch', id: 'group', label: i18n.group, defaultValue: true }] },
      ],
    }),
    canonicalValues: {
      coordinateSystem: 'cartesian2D',
      group: true,
    } as const,
    relatedApis: ['RegressionChart.coordinate', 'RegressionEncodings.series'],
  } satisfies PreviewControlContract;
};
