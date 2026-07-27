import type { FC } from 'react';

import { Axis, Legend, PathMark, Plot, Scale } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { LINE_INTERRUPTION_CONNECT_NULLS_ID, previewControlContract } from './line-interruption.controls';
import { interruptedArea } from './line-interruption.data';

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout width={700} height={320} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot data={interruptedArea} width={640} height={260} x={25} y={30} colors={['#0f8f98', '#8cf27e']}>
      <Scale dimension="x" type="linear" domainPadding={0} />
      <Scale dimension="y" type="linear" domainPadding={0} />
      <PathMark
        x="year"
        y="amount"
        order="year"
        series="name"
        color="name"
        fill="name"
        closure={{ kind: 'baseline' }}
        connectNulls={values[LINE_INTERRUPTION_CONNECT_NULLS_ID]}
        stroke="none"
        opacity={0.48}
      />
      <PathMark
        x="year"
        y="amount"
        order="year"
        series="name"
        color="name"
        connectNulls={values[LINE_INTERRUPTION_CONNECT_NULLS_ID]}
        strokeWidth={2.4}
      />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
      <Legend channel="color" />
    </Plot>
  </Layout>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

const Demo: FC = controlledPreview.Component;

export default Demo;
