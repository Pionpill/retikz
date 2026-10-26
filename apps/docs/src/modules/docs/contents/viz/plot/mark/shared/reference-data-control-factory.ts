import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { referenceCoordinateI18n } from './reference-coordinate.i18n';
import { referenceRows } from './reference-data.data';
import { referenceDataI18n } from './reference-data.i18n';

/** 同一数据集上的几何类型分别展示相关聚合与位置控件 */
export const createReferenceDataControls = (geometry: 'point' | 'path' | 'interval', lang: Lang = 'zh') => {
  const text = referenceDataI18n[lang];
  const coordinateText = referenceCoordinateI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: text[geometry],
      sections: [
        {
          label: text.data,
          controls: [
            {
              kind: 'table',
              id: 'observations',
              label: text.observations,
              rows: referenceRows,
              columns: [{ key: 'group' }, { key: 'x' }, { key: 'y' }],
            },
          ],
        },
        {
          label: text.binding,
          controls: [
            {
              kind: 'select',
              id: 'coordinate',
              label: coordinateText.coordinate,
              defaultValue: 'cartesian',
              options: [
                { value: 'cartesian', label: coordinateText.cartesian },
                { value: 'polar2D', label: coordinateText.continuous },
              ],
            },
            { kind: 'switch', id: 'grouped', label: text.grouped, defaultValue: false },
            ...(geometry === 'interval'
              ? [{ kind: 'switch' as const, id: 'fullY' as const, label: text.fullY, defaultValue: false }]
              : []),
            ...(geometry === 'interval'
              ? []
              : [
                  {
                    kind: 'select' as const,
                    id: 'statistic' as const,
                    label: text.statistic,
                    defaultValue: 'mean',
                    options: [
                      { value: 'mean' as const, label: text.mean },
                      { value: 'median' as const, label: text.median },
                    ],
                  },
                ]),
            ...(geometry === 'point'
              ? []
              : [
                  {
                    kind: 'switch' as const,
                    id: 'fullX' as const,
                    label: text.fullX,
                    defaultValue: false,
                  },
                ]),
          ],
        },
      ],
    }),
    canonicalValues: {
      coordinate: 'cartesian',
      grouped: false,
      ...(geometry === 'interval' ? { fullY: false } : {}),
      ...(geometry === 'interval' ? {} : { statistic: 'mean' }),
      ...(geometry === 'point' ? {} : { fullX: false }),
    },
    relatedApis:
      geometry === 'point'
        ? ['Plot.coordinate', 'PointMark.transforms', 'PointMark.encodings.position']
        : geometry === 'path'
          ? ['Plot.coordinate', 'PathMark.transforms', 'PathMark.encodings.from', 'PathMark.encodings.to']
          : ['Plot.coordinate', 'IntervalMark.transforms', 'IntervalMark.encodings.bounds'],
  } satisfies PreviewControlContract;
};
