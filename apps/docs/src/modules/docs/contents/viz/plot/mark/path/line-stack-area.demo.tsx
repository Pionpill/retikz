import type { PathCurveValue } from '@retikz/plot';
import type { FC } from 'react';

import { Axis, Legend, PathMark, Plot, Scale } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { LINE_STACK_AREA_CURVE_ID, previewControlContract } from './line-stack-area.controls';
import { stackArea } from './line-stack-area.data';

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const curve: PathCurveValue = values[LINE_STACK_AREA_CURVE_ID];
  return (
    <Layout width={700} height={300} style={{ maxWidth: '100%', height: 'auto' }}>
      <Plot
        data={stackArea}
        width={360}
        height={230}
        x={0}
        y={35}
        plotTheme={{ palette: { categorical: ['#2563eb', '#f97316'] } }}
      >
        <Scale dimension="x" type="point" padding={0} />
        <Scale dimension="y" type="linear" domainPadding={0} />
        <PathMark
          x="month"
          y="y1"
          order="order"
          series="segment"
          color="segment"
          fill="segment"
          curve={curve}
          closure={{ kind: 'stack', baselineField: 'y0' }}
          stroke="none"
        />
        <PathMark x="month" y="y1" order="order" series="segment" color="segment" curve={curve} strokeWidth={2} />
        <Axis dimension="x" />
        <Axis dimension="y" grid />
        <Legend channel="color" />
      </Plot>
      <Plot
        data={stackArea}
        width={280}
        height={280}
        coordinate="polar2D"
        x={410}
        y={10}
        plotTheme={{ palette: { categorical: ['#2563eb', '#f97316'] } }}
      >
        <Scale dimension="y" type="linear" domainPadding={0} />
        <PathMark
          x="month"
          y="y1"
          order="order"
          series="segment"
          color="segment"
          fill="segment"
          curve={curve}
          closure={{ kind: 'stack', baselineField: 'y0' }}
          stroke="none"
        />
        <PathMark x="month" y="y1" order="order" series="segment" color="segment" curve={curve} strokeWidth={2} />
        <Axis dimension="x" />
        <Axis dimension="y" grid />
      </Plot>
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

const Demo: FC = controlledPreview.Component;

export default Demo;
