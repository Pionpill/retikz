import type { FC } from 'react';

import { Axis, IntervalMark, Plot, Scale, Transform } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { CUSTOM_TRANSFORM_CONTROL_IDS, previewControlContract, waterfallControls } from './waterfall.controls';
import { waterfallRows } from './waterfall.data';
import { waterfallTransform } from './waterfall.definition';

/** controls registry 缺失时使用的显式回退 */
export const previewControls = waterfallControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout
    width={450}
    height={250}
    viewBox={{ x: -15, y: -15, width: 450, height: 290 }}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <Plot
      data={waterfallRows}
      width={420}
      height={260}
      colors={['#16a34a', '#dc2626']}
      transformDefinitions={[waterfallTransform]}
    >
      <Transform kind="waterfall" field="delta" initialValue={values[CUSTOM_TRANSFORM_CONTROL_IDS.initialValue]} />
      <Scale dimension="x" type="band" paddingInner={0.2} paddingOuter={0.08} />
      <Scale dimension="y" type="linear" domain={[-20, 160]} domainPadding={0} />
      <IntervalMark x="period" color="direction" bounds={{ y: { kind: 'extent', from: 'from', to: 'to' } }} />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  </Layout>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

const Demo: FC = controlledPreview.Component;

export default Demo;
