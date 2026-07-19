import type { IRNodeTarget } from '@retikz/core';
import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

import type { PreviewControlValuesFor, PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { nodeConnectionPlaygroundControls } from './node-connection-playground.controls';

export const previewControls = nodeConnectionPlaygroundControls;

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

type NodeConnectionValues = PreviewControlValuesFor<typeof nodeConnectionPlaygroundControls>;
type AnchorChoice = NodeConnectionValues['anchor'];

/** 将来源节点的轨道角度与距离转换为坐标 */
const sourcePositionOf = (angle: number, distance: number): [number, number] => {
  const radians = (angle * Math.PI) / 180;
  return [Math.cos(radians) * distance, Math.sin(radians) * distance];
};

/** 将自动、命名或数字控件转换为有效的节点端点引用 */
const targetOf = (anchor: AnchorChoice, anchorAngle: number): IRNodeTarget => ({
  id: 'target',
  ...(anchor === 'auto' ? {} : { anchor: anchor === 'angle' ? anchorAngle : anchor }),
});

/** 让连线从来源节点的可连接边界开始 */
const sourceTarget: IRNodeTarget = { id: 'source' };

/** Star 节点的连接端点 playground */
const Demo: FC = () => {
  const values = usePreviewControls(nodeConnectionPlaygroundControls);
  const sourcePosition = sourcePositionOf(values.sourceAngle, values.sourceDistance);

  return (
    <Layout width={400} height={430} viewBox={{ x: -215, y: -215, width: 430, height: 430 }}>
      <Draw way={[[0, 0], sourcePosition]} stroke="lightgray" dashPattern={[1, 4]} lineCap="round" zIndex={-2} />
      <Node
        id="target"
        position={[0, 0]}
        shape={{
          type: 'star',
          params: { points: 5, innerRadius: 24, outerRadius: 58, cornerRadius: values.cornerRadius },
        }}
        fill="#bfdbfe"
        stroke="#2563eb"
      />
      <Node id="source" position={sourcePosition} shape="circle" minimumSize={18} fill="gray" stroke="none" />
      <Draw way={[sourceTarget, targetOf(values.anchor, values.anchorAngle)]} arrow="->" stroke="gray" zIndex={-1} />
    </Layout>
  );
};

export default Demo;
