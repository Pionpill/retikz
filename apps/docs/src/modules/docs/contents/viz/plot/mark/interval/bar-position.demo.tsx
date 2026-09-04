import type { FC } from 'react';

import { IntervalMark, PlotAxis, PlotScale } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { PreviewPlot as Plot } from '@/modules/docs/components/component-preview/theme';
import { defineControlledPreview } from '@/modules/docs/preview';

import { BAR_POSITION_CONTROL_IDS, previewControlContract } from './bar-basic.controls';
import { revenue } from './bar-basic.data';

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const isPolar = values[BAR_POSITION_CONTROL_IDS.coordinate] === 'polar2D';
  const isHorizontal = !isPolar && values[BAR_POSITION_CONTROL_IDS.direction] === 'horizontal';
  const label = values[BAR_POSITION_CONTROL_IDS.showLabels] ? 'value' : undefined;
  const shadow = values[BAR_POSITION_CONTROL_IDS.shadow]
    ? { preset: 'sm' as const, color: '#0f172a', opacity: 0.24 }
    : undefined;

  return (
    <Layout
      width={380}
      height={280}
      viewBox={{ x: -16, y: -16, width: 412, height: 312 }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <Plot data={revenue} width={380} height={280} coordinate={isPolar ? 'polar2D' : undefined}>
        <IntervalMark
          x={isHorizontal ? 'value' : 'quarter'}
          y={isHorizontal ? 'quarter' : 'value'}
          direction={isPolar ? undefined : values[BAR_POSITION_CONTROL_IDS.direction]}
          color="quarter"
          cornerRadius={values[BAR_POSITION_CONTROL_IDS.cornerRadius]}
          fillOpacity={values[BAR_POSITION_CONTROL_IDS.fillOpacity]}
          stroke="#ffffff"
          strokeWidth={values[BAR_POSITION_CONTROL_IDS.strokeWidth]}
          shadow={shadow}
          label={label}
          labelPosition={isHorizontal ? 'right' : 'top'}
          labelDistance={6}
          labelFont={{ size: 10, weight: 'bold' }}
        />
        <PlotScale
          dimension={isHorizontal ? 'y' : 'x'}
          type="band"
          paddingInner={values[BAR_POSITION_CONTROL_IDS.gap]}
          paddingOuter={isHorizontal ? 0 : isPolar ? values[BAR_POSITION_CONTROL_IDS.gap] / 2 : 0.15}
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
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

const Demo: FC = controlledPreview.Component;

export default Demo;
