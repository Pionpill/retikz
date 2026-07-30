import type { IRPaintSpec } from '@retikz/core';
import type { FC } from 'react';

import { Axis, Plot, PointMark } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { points } from './point-api.data';
import { POINT_STYLE_CONTROL_IDS, previewControlContract } from './point-style.controls';

const gradientFill: IRPaintSpec = {
  kind: 'linearGradient',
  angle: 90,
  stops: [
    { offset: 0, color: '#38bdf8' },
    { offset: 1, color: '#0f172a' },
  ],
};

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const usesFieldColor = values[POINT_STYLE_CONTROL_IDS.paintMode] === 'field';
  const fill =
    values[POINT_STYLE_CONTROL_IDS.paintMode] === 'gradient'
      ? gradientFill
      : values[POINT_STYLE_CONTROL_IDS.paintMode] === 'solid'
        ? { kind: 'constant' as const, value: values[POINT_STYLE_CONTROL_IDS.fill] }
        : undefined;
  const pointProps = {
    x: 'x',
    y: 'y',
    color: usesFieldColor ? 'region' : undefined,
    fill,
    stroke: { kind: 'constant' as const, value: values[POINT_STYLE_CONTROL_IDS.stroke] },
    strokeWidth: values[POINT_STYLE_CONTROL_IDS.strokeWidth],
    fillOpacity: values[POINT_STYLE_CONTROL_IDS.fillOpacity],
    strokeOpacity: values[POINT_STYLE_CONTROL_IDS.strokeOpacity],
    opacity: values[POINT_STYLE_CONTROL_IDS.opacity],
    size: values[POINT_STYLE_CONTROL_IDS.size],
    dashed: values[POINT_STYLE_CONTROL_IDS.dashed],
    shadow: values[POINT_STYLE_CONTROL_IDS.shadow],
  };

  return (
    <Plot
      data={points}
      width={400}
      height={280}
      coordinate={values[POINT_STYLE_CONTROL_IDS.coordinate] === 'polar2D' ? 'polar2D' : undefined}
    >
      <PointMark {...pointProps} />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

/** 点的 paint、透明度、大小与描边 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
