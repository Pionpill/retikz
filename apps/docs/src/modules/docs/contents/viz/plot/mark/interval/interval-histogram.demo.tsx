import type { FC } from 'react';

import { Axis, IntervalMark, Scale, Transform } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { PreviewPlot as Plot } from '@/modules/docs/components/component-preview/theme';
import { defineControlledPreview } from '@/modules/docs/preview';

import { laborCosts } from './bar-variable-width.data';
import {
  INTERVAL_CONTINUOUS_COORDINATE_ID,
  INTERVAL_CONTINUOUS_HORIZONTAL_PADDING_ID,
  INTERVAL_CONTINUOUS_MODE_ID,
  INTERVAL_CONTINUOUS_VERTICAL_PADDING_ID,
  intervalHistogramControls,
  intervalHistogramOperationOf,
  previewControlContract,
} from './interval-histogram.controls';
import { measurements } from './interval-histogram.data';

/** 注册回退使用的连续区间 controls */
export const previewControls = intervalHistogramControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const coordinate = values[INTERVAL_CONTINUOUS_COORDINATE_ID] === 'polar2D' ? 'polar2D' : undefined;

  return (
    <Layout
      width={360}
      height={280}
      viewBox={{ x: -16, y: -16, width: 392, height: 312 }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      {values[INTERVAL_CONTINUOUS_MODE_ID] === 'histogram' ? (
        <Plot data={measurements} width={360} height={280} coordinate={coordinate}>
          <Transform {...intervalHistogramOperationOf(values)} />
          <IntervalMark x0="binStart" x1="binEnd" y="binCount" />
          <Scale dimension="x" type="linear" domainPadding={values[INTERVAL_CONTINUOUS_HORIZONTAL_PADDING_ID]} />
          <Scale dimension="y" type="linear" domainPadding={values[INTERVAL_CONTINUOUS_VERTICAL_PADDING_ID]} />
          <Axis dimension="x" />
          <Axis dimension="y" grid />
        </Plot>
      ) : (
        <Plot data={laborCosts} width={360} height={280} coordinate={coordinate}>
          <IntervalMark x="country" y="cost" width="gdp" color="country" />
          <Scale dimension="x" type="linear" domainPadding={values[INTERVAL_CONTINUOUS_HORIZONTAL_PADDING_ID]} />
          <Scale dimension="y" type="linear" domainPadding={values[INTERVAL_CONTINUOUS_VERTICAL_PADDING_ID]} />
          <Axis dimension="x" />
          <Axis dimension="y" grid />
        </Plot>
      )}
    </Layout>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

const Demo: FC = controlledPreview.Component;

export default Demo;
