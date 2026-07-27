import type { FC } from 'react';

import { Axis, IntervalMark, Plot, Scale } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { BAR_POSITION_CONTROL_IDS, previewControlContract } from './bar-basic.controls';
import { revenue } from './bar-basic.data';

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const isHorizontal = values[BAR_POSITION_CONTROL_IDS.direction] === 'horizontal';
  const label = values[BAR_POSITION_CONTROL_IDS.showLabels] ? 'value' : undefined;
  const shadow = values[BAR_POSITION_CONTROL_IDS.shadow]
    ? { preset: 'sm' as const, color: '#0f172a', opacity: 0.24 }
    : undefined;

  return (
    <Plot data={revenue} width={380} height={250} style={{ maxWidth: '100%', height: 'auto' }}>
      <IntervalMark
        x={isHorizontal ? 'value' : 'quarter'}
        y={isHorizontal ? 'quarter' : 'value'}
        direction={values[BAR_POSITION_CONTROL_IDS.direction]}
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
      <Scale
        dimension={isHorizontal ? 'y' : 'x'}
        type="band"
        paddingInner={values[BAR_POSITION_CONTROL_IDS.gap]}
        paddingOuter={isHorizontal ? 0 : 0.15}
      />
      <Scale dimension={isHorizontal ? 'x' : 'y'} type="linear" domainPadding={isHorizontal ? 0.05 : 0} />
      <Axis dimension="x" grid={isHorizontal} />
      <Axis dimension="y" grid={!isHorizontal} />
    </Plot>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

const Demo: FC = controlledPreview.Component;

export default Demo;
