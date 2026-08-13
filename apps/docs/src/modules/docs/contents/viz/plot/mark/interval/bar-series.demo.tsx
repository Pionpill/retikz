import type { FC } from 'react';

import { Axis, IntervalMark, Scale } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { PreviewPlot as Plot } from '@/modules/docs/components/component-preview/theme';
import { defineControlledPreview } from '@/modules/docs/preview';

import {
  BAR_SERIES_COORDINATE_ID,
  BAR_SERIES_GAP_ID,
  BAR_SERIES_MODE_ID,
  BAR_SERIES_STACK_OFFSET_ID,
  previewControlContract,
} from './bar-grouped.controls';
import { sales } from './bar-grouped.data';

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const isPolar = values[BAR_SERIES_COORDINATE_ID] === 'polar2D';

  return (
    <Layout
      width={400}
      height={280}
      viewBox={{ x: -16, y: -16, width: 432, height: 312 }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <Plot data={sales} width={400} height={280} coordinate={isPolar ? 'polar2D' : undefined}>
        <IntervalMark
          x="quarter"
          y="revenue"
          group="product"
          color="product"
          arrangement={values[BAR_SERIES_MODE_ID]}
          stackOffset={values[BAR_SERIES_MODE_ID] === 'stack' ? values[BAR_SERIES_STACK_OFFSET_ID] : undefined}
        />
        <Scale
          dimension="x"
          type="band"
          paddingInner={values[BAR_SERIES_GAP_ID]}
          paddingOuter={isPolar ? values[BAR_SERIES_GAP_ID] / 2 : 0.15}
        />
        <Scale dimension="y" type="linear" domainPadding={0} />
        <Axis dimension="x" />
        <Axis dimension="y" grid />
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
