import type { FC } from 'react';

import { Axis, PathMark, Plot, Scale } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  LINE_CLOSURE_BASELINE_ID,
  LINE_CLOSURE_HORIZONTAL_PADDING_ID,
  LINE_CLOSURE_VERTICAL_PADDING_ID,
  previewControlContract,
} from './line-closure.controls';
import { closureRadar, closureTrend } from './line-closure.data';

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout width={620} height={300} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot data={closureTrend} width={300} height={230} x={0} y={35}>
      <Scale dimension="x" type="point" padding={values[LINE_CLOSURE_HORIZONTAL_PADDING_ID]} />
      <Scale dimension="y" type="linear" domainPadding={values[LINE_CLOSURE_VERTICAL_PADDING_ID]} />
      <PathMark
        x="month"
        y="value"
        order="order"
        closure={{ kind: 'baseline', baseline: values[LINE_CLOSURE_BASELINE_ID] }}
        fill="rgba(14, 165, 233, 0.22)"
        stroke="none"
      />
      <PathMark x="month" y="value" order="order" stroke="#0284c7" strokeWidth={2.5} />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
    <Plot data={closureRadar} width={300} height={300} coordinate="polar2D" x={320} y={0}>
      <PathMark
        x="dim"
        y="score"
        order="order"
        closure={{ kind: 'cycle' }}
        fill="rgba(16, 185, 129, 0.22)"
        stroke="#059669"
        strokeWidth={2.5}
      />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  </Layout>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

const Demo: FC = controlledPreview.Component;

export default Demo;
