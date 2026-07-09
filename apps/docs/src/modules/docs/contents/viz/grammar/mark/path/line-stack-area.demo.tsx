import type { PathCurveValue } from '@retikz/plot';
import type { FC } from 'react';

import { PathCurve } from '@retikz/plot';
import { Axis, Legend, PathMark, Plot } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { usePreviewControlValue } from '@/modules/docs/components';

import { PATH_CURVE_CONTROL_ID } from './line-curve.controls';
import { stackArea } from './line-stack-area.data';

const Demo: FC = () => {
  const curve = usePreviewControlValue(PATH_CURVE_CONTROL_ID, PathCurve.Linear) as PathCurveValue;
  return (
    <Layout width={700} height={300} style={{ maxWidth: '100%', height: 'auto' }}>
      <Plot data={stackArea} width={360} height={230} x={0} y={35} colors={['#2563eb', '#f97316']}>
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
        colors={['#2563eb', '#f97316']}
      >
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
};

export default Demo;
