import type { PathCurveValue } from '@retikz/plot';
import type { FC } from 'react';

import { Axis, PathMark, PointMark } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { PreviewPlot as Plot } from '@/modules/docs/components/component-preview/theme';
import { defineControlledPreview } from '@/modules/docs/preview';

import {
  PATH_CURVE_CONTROL_ID,
  PATH_CURVE_CONTROL_IDS,
  PATH_CURVE_SHOW_POINTS_ID,
  previewControlContract,
} from './line-curve.controls';
import { curveSamples } from './line-curve.data';

/** 在固定数据与路径拓扑下比较连接方式和描边样式 */
const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const coordinate = values[PATH_CURVE_CONTROL_IDS.coordinate];
  const curve: PathCurveValue = values[PATH_CURVE_CONTROL_ID];
  const showPoints = values[PATH_CURVE_SHOW_POINTS_ID];
  const x = coordinate === 'polar2D' ? 'category' : 'index';
  return (
    <Layout width={400} height={280} viewBox={{ x: -12, y: 0, width: 420, height: 292 }}>
      <Plot data={curveSamples} width={400} height={280} coordinate={coordinate === 'polar2D' ? 'polar2D' : undefined}>
        <PathMark
          x={x}
          y="value"
          order="index"
          curve={curve}
          closed={coordinate === 'polar2D' && values[PATH_CURVE_CONTROL_IDS.closed]}
          stroke={{ kind: 'constant', value: values[PATH_CURVE_CONTROL_IDS.stroke] }}
          strokeWidth={values[PATH_CURVE_CONTROL_IDS.strokeWidth]}
          dashPattern={values[PATH_CURVE_CONTROL_IDS.dashed] ? [8, 6] : undefined}
          opacity={values[PATH_CURVE_CONTROL_IDS.opacity]}
          lineCap="round"
          lineJoin="round"
        />
        {showPoints ? <PointMark x={x} y="value" fill="#64748b" opacity={0.72} minimumSize={5} /> : null}
        <Axis dimension="x" />
        <Axis dimension="y" grid />
      </Plot>
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

/** 路径连接与样式 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
