import type { PathCurveValue } from '@retikz/plot';
import type { FC } from 'react';

import { PathCurve } from '@retikz/plot';
import { Axis, PathMark, Plot } from '@retikz/plot-react';

import { usePreviewActionValue } from '@/modules/docs/components';

import { PATH_CURVE_ACTION_ID } from './line-curve.actions';
import { curveSamples } from './line-curve.data';

/** 连接方式：左侧笛卡尔、右侧极坐标，共用一个 curve 值。 */
const Demo: FC = () => {
  const curve = usePreviewActionValue(PATH_CURVE_ACTION_ID, PathCurve.Linear) as PathCurveValue;
  return (
    <div className="grid w-full max-w-3xl grid-cols-1 items-center gap-4 sm:grid-cols-2">
      <Plot data={curveSamples} width={340} height={240} style={{ maxWidth: '100%', height: 'auto' }}>
        <PathMark x="index" y="value" order="index" curve={curve} />
        <Axis dimension="x" />
        <Axis dimension="y" grid />
      </Plot>
      <Plot
        data={curveSamples}
        width={280}
        height={280}
        coordinate="polar2D"
        style={{ maxWidth: '100%', height: 'auto' }}
      >
        <PathMark x="category" y="value" order="index" curve={curve} />
        <Axis dimension="x" />
        <Axis dimension="y" grid />
      </Plot>
    </div>
  );
};

export default Demo;
