import type { FC } from 'react';

import { Axis, IntervalMark, Plot, Scale, Transform } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { laborCosts } from './bar-variable-width.data';
import {
  INTERVAL_CONTINUOUS_HORIZONTAL_PADDING_ID,
  INTERVAL_CONTINUOUS_MODE_ID,
  INTERVAL_CONTINUOUS_VERTICAL_PADDING_ID,
  INTERVAL_HISTOGRAM_COUNT_ID,
  intervalHistogramControls,
  previewControlContract,
} from './interval-histogram.controls';
import { measurements } from './interval-histogram.data';

/** 注册回退使用的连续区间 controls */
export const previewControls = intervalHistogramControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  values[INTERVAL_CONTINUOUS_MODE_ID] === 'histogram' ? (
    <Plot data={measurements} width={360} height={240} style={{ maxWidth: '100%', height: 'auto' }}>
      <Transform kind="bin" field="measurement" count={values[INTERVAL_HISTOGRAM_COUNT_ID]} />
      <IntervalMark x0="binStart" x1="binEnd" y="binCount" />
      <Scale dimension="x" type="linear" domainPadding={values[INTERVAL_CONTINUOUS_HORIZONTAL_PADDING_ID]} />
      <Scale dimension="y" type="linear" domainPadding={values[INTERVAL_CONTINUOUS_VERTICAL_PADDING_ID]} />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  ) : (
    <Plot data={laborCosts} width={360} height={240} style={{ maxWidth: '100%', height: 'auto' }}>
      <IntervalMark x="country" y="cost" width="gdp" color="country" />
      <Scale dimension="x" type="linear" domainPadding={values[INTERVAL_CONTINUOUS_HORIZONTAL_PADDING_ID]} />
      <Scale dimension="y" type="linear" domainPadding={values[INTERVAL_CONTINUOUS_VERTICAL_PADDING_ID]} />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  ),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

const Demo: FC = controlledPreview.Component;

export default Demo;
