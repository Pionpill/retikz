import type { IRNodeTarget } from '@retikz/core';
import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

import type { PreviewControlValuesFor, PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import type { NodeBoundaryChoice, NodeShapeChoice } from './node-shape-connection-boundary';

import { nodeShapeConnectionControls } from './node-shape-connection.controls';
import { boundaryGuideShape, nodeShapeOf } from './node-shape-connection-boundary';

export const previewControls = nodeShapeConnectionControls;

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

type NodeShapeConnectionValues = PreviewControlValuesFor<typeof nodeShapeConnectionControls>;
type AnchorChoice = NodeShapeConnectionValues['anchorA'];

/** 把 controls 值转换为 Draw 的节点端点引用 */
const targetOf = (id: string, anchor: AnchorChoice): IRNodeTarget => ({
  id,
  ...(anchor === 'auto' ? {} : { anchor }),
});

type BoundaryGuideProps = {
  position: [number, number];
  shape: NodeShapeChoice;
  boundary: NodeBoundaryChoice;
  children: string;
};

/** 在可见 Node 上方绘制当前连接面的浅色虚线辅助轮廓 */
const BoundaryGuide: FC<BoundaryGuideProps> = props => {
  const { position, shape, boundary, children } = props;
  return (
    <Node
      position={position}
      shape={{ type: boundaryGuideShape.name, params: { shape, boundary } }}
      fill="none"
      stroke="#94a3b8"
      strokeOpacity={0.6}
      strokeWidth={1}
      dashPattern={[5, 4]}
      textColor="transparent"
      zIndex={1}
    >
      {children}
    </Node>
  );
};

/**
 * Node 形状与连接 playground
 * @description 两个节点分别切换视觉 shape、连接面 boundary 与标准命名 anchor；同一条边实时显示端点解析结果
 */
const Demo: FC = () => {
  const values = usePreviewControls(nodeShapeConnectionControls);

  return (
    <Layout
      width={520}
      height={240}
      viewBox={{ x: -260, y: -120, width: 520, height: 240 }}
      shapes={[boundaryGuideShape]}
    >
      <Node
        id="A"
        position={[-150, 0]}
        shape={nodeShapeOf(values.shapeA)}
        boundary={values.boundaryA}
        fill="#fbbf24"
        stroke="#b45309"
        textColor="#78350f"
      >
        a
      </Node>
      <Node
        id="B"
        position={[150, 0]}
        shape={nodeShapeOf(values.shapeB)}
        boundary={values.boundaryB}
        fill="#93c5fd"
        stroke="#1d4ed8"
        textColor="#1e3a8a"
      >
        b
      </Node>
      <BoundaryGuide position={[-150, 0]} shape={values.shapeA} boundary={values.boundaryA}>
        a
      </BoundaryGuide>
      <BoundaryGuide position={[150, 0]} shape={values.shapeB} boundary={values.boundaryB}>
        b
      </BoundaryGuide>
      <Draw way={[targetOf('A', values.anchorA), targetOf('B', values.anchorB)]} arrow="->" stroke="gray" zIndex={-1} />
    </Layout>
  );
};

export default Demo;
