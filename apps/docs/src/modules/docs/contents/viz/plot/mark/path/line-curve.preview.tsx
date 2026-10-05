import type { PathCurve } from '@retikz/plot';
import { PathMark, PlotAxis, PointMark } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { PreviewPlot as Plot } from '@/modules/docs/components/component-preview/theme';

import { curveSamples } from './line-curve.data';

/** 图形参数 */
export type LineCurvePreviewValues = {
  coordinate: 'cartesian2D' | 'polar2D';
  pathCurveControl:
    | 'step'
    | 'linear'
    | 'stepBefore'
    | 'stepAfter'
    | 'basis'
    | 'cardinal'
    | 'catmullRom'
    | 'monotoneX'
    | 'monotoneY'
    | 'natural';
  pathCurveShowPoints: boolean;
  closed: boolean;
  stroke: string;
  strokeWidth: number;
  dashed: boolean;
  opacity: number;
};

/** 绘制示例图形 */
export const LineCurvePreview = (values: LineCurvePreviewValues) => {
  const coordinate = values.coordinate;
  const curve: PathCurve = values.pathCurveControl;
  const showPoints = values.pathCurveShowPoints;
  const x = coordinate === 'polar2D' ? 'category' : 'index';
  return (
    <Layout viewBox={{ x: -12, y: 0, width: 420, height: 292 }}>
      <Plot data={curveSamples} width={400} height={280} coordinate={coordinate === 'polar2D' ? 'polar2D' : undefined}>
        <PathMark
          x={x}
          y="value"
          order="index"
          curve={curve}
          closed={coordinate === 'polar2D' && values.closed}
          stroke={{ kind: 'constant', value: values.stroke }}
          strokeWidth={values.strokeWidth}
          dashPattern={values.dashed ? [8, 6] : undefined}
          opacity={values.opacity}
          lineCap="round"
          lineJoin="round"
        />
        {showPoints ? <PointMark x={x} y="value" fill="#64748b" opacity={0.72} minimumSize={5} /> : null}
        <PlotAxis dimension="x" />
        <PlotAxis dimension="y" grid />
      </Plot>
    </Layout>
  );
};
