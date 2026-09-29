import { PathMark, Plot, PlotAxis, PlotScale } from '@retikz/plot-react';

import { closureTrend } from './line-closure.data';

/** 图形参数 */
export type LineClosurePreviewValues = {
  coordinate: 'cartesian2D' | 'polar2D';
  mode: 'open' | 'cycle' | 'baseline';
  baseline: number;
  horizontalPadding: number;
  verticalPadding: number;
  closed: boolean;
  fillOpacity: number;
};

/** 绘制示例图形 */
export const LineClosurePreview = (values: LineClosurePreviewValues) => {
  const coordinate = values.coordinate;
  const mode = values.mode;
  const closure =
    mode === 'baseline'
      ? { kind: 'baseline' as const, baseline: values.baseline }
      : mode === 'cycle'
        ? { kind: 'cycle' as const }
        : undefined;

  return (
    <Plot data={closureTrend} width={400} height={280} coordinate={coordinate === 'polar2D' ? 'polar2D' : undefined}>
      <PlotScale dimension="x" type="point" padding={values.horizontalPadding} />
      <PlotScale
        dimension="y"
        type="linear"
        domainPadding={{
          kind: 'ratio',
          lower: values.verticalPadding,
          upper: values.verticalPadding,
        }}
      />
      <PathMark
        x="month"
        y="value"
        order="order"
        closure={closure}
        closed={coordinate === 'polar2D' && values.closed}
        fill={
          closure === undefined
            ? 'none'
            : {
                kind: 'constant',
                value: `rgba(56, 189, 248, ${values.fillOpacity})`,
              }
        }
        stroke="#0284c7"
        strokeWidth={3}
        lineJoin="round"
      />
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" grid />
    </Plot>
  );
};
