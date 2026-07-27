import type { FC } from 'react';

import { Axis, IntervalMark, Plot, Scale } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, RECT_BOUNDS_MODE_ID, RECT_BOUNDS_SHOW_COLOR_ID } from './rect-bounds.controls';
import { matrix } from './rect-heatmap.data';

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Plot
    data={matrix}
    model={[
      { name: 'row', type: 'categorical' },
      { name: 'col', type: 'categorical' },
      { name: 'value', type: 'continuous' },
    ]}
    width={380}
    height={260}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <IntervalMark
      x="col"
      y="row"
      color={values[RECT_BOUNDS_SHOW_COLOR_ID] ? 'value' : undefined}
      fill={values[RECT_BOUNDS_SHOW_COLOR_ID] ? undefined : '#60a5fa'}
      bounds={{
        x: { kind: 'band' },
        y: values[RECT_BOUNDS_MODE_ID] === 'band' ? { kind: 'band' } : { kind: 'full' },
      }}
    />
    <Scale dimension="x" type="band" paddingOuter={0.15} />
    <Scale dimension="y" type="band" paddingOuter={0} />
    <Axis dimension="x" />
    <Axis dimension="y" />
  </Plot>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

const Demo: FC = controlledPreview.Component;

export default Demo;
