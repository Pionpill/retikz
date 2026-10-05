import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { createPointCoordinateSection } from '../point-coordinate-control';
import { rangedDotData } from './ranged-dot-basic.data';
import { rangedDotEncodingsI18n } from './ranged-dot-encodings.i18n';

/** 仅控制当前示例的数据映射 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const i18n = rangedDotEncodingsI18n[lang];
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
              rows: rangedDotData,
              columns: Object.keys(rangedDotData[0] ?? {}).map(key => ({ key })),
            },
          ],
        },

        createPointCoordinateSection('coordinateSystem', lang),
        { label: i18n.title, controls: [{ kind: 'switch', id: 'reverse', label: i18n.reverse, defaultValue: false }] },
      ],
    }),
    canonicalValues: {
      coordinateSystem: 'cartesian2D',
      reverse: false,
    } as const,
    relatedApis: ['RangedDotChart.coordinate', 'RangedDotEncodings.start', 'RangedDotEncodings.end'],
  } satisfies PreviewControlContract;
};
