import type { IRNodeTarget } from '@retikz/core';
import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';
import { SectorShapeDefinition } from '@retikz/standard/shape';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { defineControlledPreview } from '@/modules/docs/preview';

import { nodeConnectionPlaygroundControls, previewControlContract } from './node-connection-playground.controls';

export const previewControls = nodeConnectionPlaygroundControls;

type NodeConnectionValues = PreviewControlValuesFor<typeof nodeConnectionPlaygroundControls>;
type AnchorChoice = NodeConnectionValues['anchor'];
type TargetShape = { type: 'sector'; params: Record<string, number> };

/** 将来源节点的轨道角度与距离转换为坐标 */
const sourcePositionOf = (angle: number, distance: number): [number, number] => {
  const radians = (angle * Math.PI) / 180;
  return [Math.cos(radians) * distance, Math.sin(radians) * distance];
};

/** 将语义选择映射为 Sector 当前状态存在的命名 anchor */
const targetOf = (anchor: AnchorChoice): IRNodeTarget => {
  if (anchor === 'auto') return { id: 'target' };
  if (anchor === 'center') return { id: 'target', anchor: 'center' };
  const anchorByChoice = {
    start: 'start-edge-mid',
    midpoint: 'outer-arc-mid',
    'inner-midpoint': 'inner-arc-mid',
    end: 'end-edge-mid',
  } as const;
  return { id: 'target', anchor: anchorByChoice[anchor] };
};

/** 让连线从来源节点的可连接边界开始 */
const sourceTarget: IRNodeTarget = { id: 'source' };

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const sourcePosition = sourcePositionOf(values.sourceAngle, values.sourceDistance);
  const isOpenArc = values.shape === 'open-arc';
  const targetShape: TargetShape = {
    type: 'sector',
    params: {
      innerRadius: isOpenArc ? 72 : 24,
      outerRadius: 72,
      startAngle: -60,
      endAngle: 70,
      ...(isOpenArc ? {} : { cornerRadius: values.cornerRadius }),
    },
  };

  return (
    <Layout
      width={400}
      height={430}
      viewBox={{ x: -215, y: -215, width: 430, height: 430 }}
      shapes={[SectorShapeDefinition]}
    >
      <Draw way={[[0, 0], sourcePosition]} stroke="lightgray" dashPattern={[1, 4]} lineCap="round" zIndex={-2} />
      <Node id="target" position={[0, 0]} shape={targetShape} fill="#bfdbfe" stroke="#2563eb" />
      <Node id="source" position={sourcePosition} shape="circle" minimumSize={18} fill="gray" stroke="none" />
      <Draw way={[sourceTarget, targetOf(values.anchor)]} arrow="->" stroke="gray" zIndex={-1} />
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** 开放弧与 Sector 节点的自动贴边和命名 anchor playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
