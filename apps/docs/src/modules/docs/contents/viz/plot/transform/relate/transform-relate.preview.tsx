import { PathMark, Plot, PlotAxis, PlotScale, PointMark, RelationMark } from '@retikz/plot-react';

import type { Lang } from '@/i18n';

import { relateOperationOf } from './transform-relate.controls';
import { monthlyTrend } from './transform-relate.data';
import { transformRelateI18n } from './transform-relate.i18n';

/** 图形参数 */
export type TransformRelatePreviewValues = {
  pairingScope: 'all' | 'series';
  sourceSelector: 'min' | 'max' | 'first' | 'last';
  targetSelector: 'min' | 'max' | 'first' | 'last';
};

/** 绘制示例图形 */
export const TransformRelatePreview = (values: TransformRelatePreviewValues, lang: Lang) => {
  const i18n = transformRelateI18n[lang];
  return (
    <Plot data={monthlyTrend} width={520} height={320}>
      <PlotScale dimension="x" type="linear" domain={[0.5, 6.5]} />
      <PlotScale dimension="y" type="linear" domain={[20, 62]} />
      <PathMark
        color="series"
        series="series"
        x="month"
        y="value"
        order="month"
        strokeWidth={2.2}
        anchorId={{ prefix: 'trend', field: 'id' }}
      />
      <PointMark
        x="month"
        y="value"
        fill={{ kind: 'constant', value: 'white' }}
        stroke="series"
        strokeWidth={1.2}
        size={5}
      />
      <RelationMark
        transform={[{ operation: relateOperationOf(values) }]}
        source={{ anchorId: { prefix: 'trend', field: 'sourceId' } }}
        target={{ anchorId: { prefix: 'trend', field: 'targetId' } }}
        style={{
          color: { kind: 'constant', value: 'mediumvioletred' },
          strokeWidth: { kind: 'constant', value: 1.6 },
        }}
        path={{
          routing: { kind: 'bend', bendDirection: 'left', bendAngle: 28 },
          label: {
            text: { field: 'deltaLabel' },
            position: 0.5,
            side: 'top',
            distance: 4,
            sloped: true,
            textColor: 'mediumvioletred',
            font: { size: 11, weight: 'bold' },
          },
          options: { marks: [{ pos: 1, mark: { kind: 'arrow' } }] },
        }}
      />
      <PlotAxis dimension="x" title={i18n.month} grid />
      <PlotAxis dimension="y" title={i18n.value} grid />
    </Plot>
  );
};
