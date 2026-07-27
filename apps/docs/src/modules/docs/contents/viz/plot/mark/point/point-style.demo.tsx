import type { IRPaintSpec } from '@retikz/core';
import type { FC } from 'react';

import { Axis, Plot, PointMark } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

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
    opacity: values[POINT_STYLE_CONTROL_IDS.opacity],
    size: values[POINT_STYLE_CONTROL_IDS.size],
    shape: { kind: 'constant' as const, value: values[POINT_STYLE_CONTROL_IDS.shape] },
  };

  return (
    <Layout width={620} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
      <Plot data={points} width={300} height={220} x={0} y={20}>
        <PointMark {...pointProps} />
        <Axis dimension="x" />
        <Axis dimension="y" grid />
      </Plot>
      <Plot data={points} width={260} height={260} coordinate="polar2D" x={340} y={0}>
        <PointMark {...pointProps} />
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

/** 点通道、paint、透明度、大小与形状 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
