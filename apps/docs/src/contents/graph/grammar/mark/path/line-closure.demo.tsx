import type { PathCurveValue } from '@retikz/plot';
import type { FC } from 'react';

import { PathCurve } from '@retikz/plot';
import { Axis, PathMark, Plot } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { usePreviewActionValue } from '@/components/shared/component-preview/_shared';

import { closureRadar, closureTrend } from './line-closure.data';
import { PATH_CURVE_ACTION_ID } from './line-curve.actions';

const Demo: FC = () => {
  const curve = usePreviewActionValue(PATH_CURVE_ACTION_ID, PathCurve.Linear) as PathCurveValue;
  return (
    <Layout width={620} height={300} style={{ maxWidth: '100%', height: 'auto' }}>
      <Plot data={closureTrend} width={300} height={230} x={0} y={35}>
        <PathMark
          x="month"
          y="value"
          order="order"
          curve={curve}
          closure={{ kind: 'baseline', baseline: 30 }}
          fill="rgba(14, 165, 233, 0.22)"
          stroke="none"
        />
        <PathMark x="month" y="value" order="order" curve={curve} stroke="#0284c7" strokeWidth={2.5} />
        <Axis dimension="x" />
        <Axis dimension="y" grid />
      </Plot>
      <Plot data={closureRadar} width={300} height={300} coordinate="polar2D" x={320} y={0}>
        <PathMark
          x="dim"
          y="score"
          order="order"
          curve={curve}
          closure={{ kind: 'cycle' }}
          fill="rgba(16, 185, 129, 0.22)"
          stroke="#059669"
          strokeWidth={2.5}
        />
        <Axis dimension="x" />
        <Axis dimension="y" grid />
      </Plot>
    </Layout>
  );
};

export default Demo;
