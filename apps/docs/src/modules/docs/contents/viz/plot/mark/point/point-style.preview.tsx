import type { IRPaint } from '@retikz/core';
import { PlotAxis, PointMark } from '@retikz/plot-react';
import type { PointMarkProps } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { PreviewPlot as Plot } from '@/modules/docs/components/component-preview/theme';

import { stylePoints } from './point-api.data';

const gradientFill: IRPaint = {
  kind: 'linearGradient',
  angle: 90,
  stops: [
    { offset: 0, color: '#38bdf8' },
    { offset: 1, color: '#0f172a' },
  ],
};

/** 图形参数 */
export type PointStylePreviewValues = {
  paintMode: 'field' | 'solid' | 'gradient';
  fill: string;
  stroke: string;
  strokeWidth: number;
  fillOpacity: number;
  strokeOpacity: number;
  opacity: number;
  size: number;
  dashed: boolean;
  shadow: 'none' | 'md' | 'xl';
  /** 点线描边 */
  dotted: boolean;
  /** 自定义虚线 */
  dashPattern: boolean;
  /** 混合模式 */
  blendMode: 'normal' | 'multiply' | 'screen';
  /** 绘制顺序 */
  zIndex: 'order' | 'reverseOrder';
  coordinate: 'cartesian2D' | 'polar2D';
};

/** 绘制示例图形 */
export const PointStylePreview = (values: PointStylePreviewValues) => {
  const usesFieldColor = values.paintMode === 'field';
  const fill = values.paintMode === 'gradient' ? gradientFill : values.paintMode === 'solid' ? values.fill : undefined;
  const pointProps: PointMarkProps = {
    encodings: {
      position: { x: { field: 'x' }, y: { field: 'y' } },
      zIndex: values.zIndex,
      ...(usesFieldColor ? { color: 'region' } : {}),
    },
    properties: {
      fill,
      stroke: values.stroke,
      strokeWidth: values.strokeWidth,
      opacity: {
        overall: values.opacity,
        fill: values.fillOpacity,
        stroke: values.strokeOpacity,
      },
      size: values.size,
      dashed: values.dashed,
      dotted: values.dotted,
      dashPattern: values.dashPattern ? [8, 3, 2, 3] : undefined,
      blendMode: values.blendMode,
      shadow: values.shadow,
    },
  };

  return (
    <Layout viewBox={{ x: -40, y: -40, width: 480, height: 360 }}>
      <Plot
        data={stylePoints}
        width={400}
        height={280}
        coordinate={values.coordinate === 'polar2D' ? 'polar2D' : undefined}
      >
        <PointMark {...pointProps} />
        <PlotAxis dimension="x" />
        <PlotAxis dimension="y" grid />
      </Plot>
    </Layout>
  );
};
