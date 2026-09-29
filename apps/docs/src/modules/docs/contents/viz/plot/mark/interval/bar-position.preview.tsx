import { IntervalMark, PlotAxis, PlotScale } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { PreviewPlot as Plot } from '@/modules/docs/components/component-preview/theme';

import { revenue } from './bar-basic.data';

/** 图形参数 */
export type BarPositionPreviewValues = {
  coordinate: 'cartesian2D' | 'polar2D';
  direction: 'vertical' | 'horizontal';
  showLabels: boolean;
  shadow: boolean;
  cornerRadius: number;
  fillOpacity: number;
  strokeWidth: number;
  gap: number;
};

/** 绘制示例图形 */
export const BarPositionPreview = (values: BarPositionPreviewValues) => {
  const isPolar = values.coordinate === 'polar2D';
  const isHorizontal = !isPolar && values.direction === 'horizontal';
  const label = values.showLabels ? 'value' : undefined;
  const shadow = values.shadow ? { preset: 'sm' as const, color: '#0f172a', opacity: 0.24 } : undefined;

  return (
    <Layout viewBox={{ x: -16, y: -16, width: 412, height: 312 }}>
      <Plot data={revenue} width={380} height={280} coordinate={isPolar ? 'polar2D' : undefined}>
        <IntervalMark
          x={isHorizontal ? 'value' : 'quarter'}
          y={isHorizontal ? 'quarter' : 'value'}
          direction={isPolar ? undefined : values.direction}
          color="quarter"
          cornerRadius={values.cornerRadius}
          fillOpacity={values.fillOpacity}
          stroke="#ffffff"
          strokeWidth={values.strokeWidth}
          shadow={shadow}
          label={label}
          labelPosition={isHorizontal ? 'right' : 'top'}
          labelDistance={6}
          labelFont={{ size: 10, weight: 'bold' }}
        />
        <PlotScale
          dimension={isHorizontal ? 'y' : 'x'}
          type="band"
          paddingInner={values.gap}
          paddingOuter={isHorizontal ? 0 : isPolar ? values.gap / 2 : 0.15}
        />
        <PlotScale
          dimension={isHorizontal ? 'x' : 'y'}
          type="linear"
          domainPadding={isHorizontal ? { kind: 'ratio', lower: 0.05, upper: 0.05 } : 0}
        />
        <PlotAxis dimension="x" grid={isHorizontal} />
        <PlotAxis dimension="y" grid={!isHorizontal} />
      </Plot>
    </Layout>
  );
};
