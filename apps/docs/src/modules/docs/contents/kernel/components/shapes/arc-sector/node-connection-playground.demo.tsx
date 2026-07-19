import type { IRNodeTarget } from '@retikz/core';
import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

import type { PreviewControlValuesFor, PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { nodeConnectionPlaygroundControls } from './node-connection-playground.controls';

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

type NodeConnectionValues = PreviewControlValuesFor<typeof nodeConnectionPlaygroundControls>;
type AnchorChoice = NodeConnectionValues['anchor'];
type TargetShape = { type: 'arc' | 'sector'; params: Record<string, number> };

/** 将来源节点的轨道角度与距离转换为坐标 */
const sourcePositionOf = (angle: number, distance: number): [number, number] => {
  const radians = (angle * Math.PI) / 180;
  return [Math.cos(radians) * distance, Math.sin(radians) * distance];
};

/** 将跨形状的语义选择映射为当前形状存在的命名 anchor */
const targetOf = (shape: NodeConnectionValues['shape'], anchor: AnchorChoice): IRNodeTarget => {
  if (anchor === 'auto') return { id: 'target' };
  if (anchor === 'center') return { id: 'target', anchor: 'center' };

  const anchorByShape =
    shape === 'arc'
      ? { start: 'start', midpoint: 'arc-mid', 'inner-midpoint': 'arc-mid', end: 'end' }
      : {
          start: 'start-edge-mid',
          midpoint: 'outer-arc-mid',
          'inner-midpoint': 'inner-arc-mid',
          end: 'end-edge-mid',
        };
  return { id: 'target', anchor: anchorByShape[anchor] };
};

/** 让连线从来源节点的可连接边界开始 */
const sourceTarget: IRNodeTarget = { id: 'source' };

/** Arc 与 Sector 节点的自动贴边和命名 anchor playground */
const Demo: FC = () => {
  const values = usePreviewControls(nodeConnectionPlaygroundControls);
  const sourcePosition = sourcePositionOf(values.sourceAngle, values.sourceDistance);
  const targetShape: TargetShape =
    values.shape === 'arc'
      ? { type: 'arc' as const, params: { radius: 72, startAngle: -60, endAngle: 70 } }
      : {
          type: 'sector' as const,
          params: {
            innerRadius: 24,
            outerRadius: 72,
            startAngle: -60,
            endAngle: 70,
            cornerRadius: values.cornerRadius,
          },
        };

  return (
    <Layout width={430} height={430} viewBox={{ x: -215, y: -215, width: 430, height: 430 }}>
      <Draw way={[[0, 0], sourcePosition]} stroke="lightgray" dashPattern={[4, 4]} zIndex={-2} />
      <Node id="target" position={[0, 0]} shape={targetShape} fill="#bfdbfe" stroke="#2563eb" />
      <Node id="source" position={sourcePosition} shape="circle" minimumSize={18} fill="gray" stroke="none" />
      <Draw way={[sourceTarget, targetOf(values.shape, values.anchor)]} arrow="->" stroke="gray" zIndex={-1} />
    </Layout>
  );
};

export default Demo;
