import type { PathCurveValue } from '@retikz/plot';
import type { FC } from 'react';

import { Axis, PathMark, Plot } from '@retikz/plot-react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { lineCurveControls, PATH_CURVE_CONTROL_ID } from './line-curve.controls';
import { curveSamples } from './line-curve.data';

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

/** 连接方式：左侧笛卡尔、右侧极坐标，共用一个 curve 值。 */
const Demo: FC = () => {
  const curve: PathCurveValue = usePreviewControls(lineCurveControls)[PATH_CURVE_CONTROL_ID];
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
