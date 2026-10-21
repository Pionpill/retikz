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
export const TransformRelatePreview = (
  values: TransformRelatePreviewValues,
  lang: Lang,
  dimensions?: { width: number; height: number },
) => {
  const i18n = transformRelateI18n[lang];
  return (
    <Plot
      style={
        dimensions
          ? { width: 'auto', height: 'auto', maxWidth: dimensions.width, maxHeight: dimensions.height }
          : undefined
      }
      data={monthlyTrend}
      width={520}
      height={320}
    >
      <PlotScale dimension="x" type="linear" domain={[0.5, 6.5]} />
      <PlotScale dimension="y" type="linear" domain={[20, 62]} />
      <PathMark
        encodings={{
          color: 'series',
          series: 'series',
          order: 'month',
          anchorId: 'id',
          position: { x: 'month', y: 'value' },
        }}
        properties={{ strokeWidth: 2.2, anchorId: { prefix: 'trend' } }}
      />
      <PointMark
        encodings={{ stroke: 'series', position: { x: 'month', y: 'value' } }}
        properties={{ fill: 'white', strokeWidth: 1.2, size: 5 }}
      />
      <RelationMark
        transforms={[{ operation: relateOperationOf(values) }]}
        encodings={{
          source: { anchorId: 'sourceId' },
          target: { anchorId: 'targetId' },
          geometry: { label: { text: 'deltaLabel' } },
        }}
        properties={{
          source: { anchorId: { prefix: 'trend' } },
          target: { anchorId: { prefix: 'trend' } },
          color: 'mediumvioletred',
          strokeWidth: 1.6,
          geometry: {
            kind: 'path',
            routing: { kind: 'bend', bendDirection: 'left', bendAngle: 28 },
            label: {
              position: 0.5,
              side: 'top',
              distance: 4,
              sloped: true,
              textColor: 'mediumvioletred',
              font: { size: 11, weight: 'bold' },
            },
            options: { marks: [{ pos: 1, mark: { kind: 'arrow' } }] },
          },
        }}
      />
      <PlotAxis dimension="x" title={i18n.month} grid />
      <PlotAxis dimension="y" title={i18n.value} grid />
    </Plot>
  );
};
