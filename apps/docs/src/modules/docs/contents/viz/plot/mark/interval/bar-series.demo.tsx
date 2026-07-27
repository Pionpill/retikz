import type { FC } from 'react';

import { Axis, IntervalMark, Plot, Scale } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  BAR_SERIES_GAP_ID,
  BAR_SERIES_MODE_ID,
  BAR_SERIES_STACK_OFFSET_ID,
  previewControlContract,
} from './bar-grouped.controls';
import { sales } from './bar-grouped.data';

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Plot data={sales} width={420} height={250} style={{ maxWidth: '100%', height: 'auto' }}>
    <IntervalMark
      x="quarter"
      y="revenue"
      group="product"
      color="product"
      arrangement={values[BAR_SERIES_MODE_ID]}
      stackOffset={values[BAR_SERIES_MODE_ID] === 'stack' ? values[BAR_SERIES_STACK_OFFSET_ID] : undefined}
    />
    <Scale dimension="x" type="band" paddingInner={values[BAR_SERIES_GAP_ID]} paddingOuter={0.15} />
    <Scale dimension="y" type="linear" domainPadding={0} />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

const Demo: FC = controlledPreview.Component;

export default Demo;
