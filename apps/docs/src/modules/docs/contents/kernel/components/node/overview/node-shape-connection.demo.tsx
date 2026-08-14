import type { IRBoundary, IRNodeTarget } from '@retikz/core';
import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';
import { SectorShapeDefinition, StarShapeDefinition } from '@retikz/standard/shape';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { defineControlledPreview } from '@/modules/docs/preview';

import type { NodeBoundaryChoice, NodeShapeChoice } from './node-shape-connection-boundary';

import { nodeShapeConnectionControls, previewControlContract } from './node-shape-connection.controls';
import { boundaryGuideShape, nodeShapeOf } from './node-shape-connection-boundary';

export const previewControls = nodeShapeConnectionControls;

type NodeShapeConnectionValues = PreviewControlValuesFor<typeof nodeShapeConnectionControls>;
type AnchorChoice = NodeShapeConnectionValues['anchorA'];
type BoundaryFitChoice = NodeShapeConnectionValues['fitA'];

/** 把 controls 值转换为 Draw 的节点端点引用 */
const targetOf = (id: string, anchor: AnchorChoice): IRNodeTarget => ({
  id,
  ...(anchor === 'auto' ? {} : { anchor }),
});

/** 把 control 值转换为 Node 的连接面引用 */
const boundaryOf = (boundary: NodeBoundaryChoice, fit: BoundaryFitChoice, gap: number): IRBoundary =>
  boundary === 'shape' ? boundary : { type: boundary, params: { fit, gap } };

type BoundaryGuideProps = {
  position: [number, number];
  shape: NodeShapeChoice;
  boundary: NodeBoundaryChoice;
  fit: BoundaryFitChoice;
  gap: number;
  children: string;
};

/** 在可见 Node 上方绘制当前连接面的浅色点状辅助轮廓 */
const BoundaryGuide: FC<BoundaryGuideProps> = props => {
  const { position, shape, boundary, fit, gap, children } = props;
  return (
    <Node
      position={position}
      shape={{ type: boundaryGuideShape.name, params: { shape, boundary, fit, gap } }}
      fill="none"
      stroke="#94a3b8"
      strokeOpacity={0.6}
      strokeWidth={1}
      dashPattern={[1, 4]}
      textColor="transparent"
      zIndex={1}
    >
      {children}
    </Node>
  );
};

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  return (
    <Layout
      width={400}
      height={185}
      viewBox={{ x: -260, y: -120, width: 520, height: 240 }}
      shapes={[boundaryGuideShape, SectorShapeDefinition, StarShapeDefinition]}
    >
      <Node
        id="A"
        position={[-150, 0]}
        shape={nodeShapeOf(values.shapeA)}
        boundary={boundaryOf(values.boundaryA, values.fitA, values.gapA)}
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
        boundary={boundaryOf(values.boundaryB, values.fitB, values.gapB)}
        fill="#93c5fd"
        stroke="#1d4ed8"
        textColor="#1e3a8a"
      >
        b
      </Node>
      <BoundaryGuide
        position={[-150, 0]}
        shape={values.shapeA}
        boundary={values.boundaryA}
        fit={values.fitA}
        gap={values.gapA}
      >
        a
      </BoundaryGuide>
      <BoundaryGuide
        position={[150, 0]}
        shape={values.shapeB}
        boundary={values.boundaryB}
        fit={values.fitB}
        gap={values.gapB}
      >
        b
      </BoundaryGuide>
      <Draw way={[targetOf('A', values.anchorA), targetOf('B', values.anchorB)]} arrow="->" stroke="gray" zIndex={-1} />
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/**
 * Node 形状与连接 playground
 * @description 两个节点分别切换视觉 shape、连接面 boundary 与标准命名 anchor；同一条边实时显示端点解析结果
 */
const Demo: FC = controlledPreview.Component;

export default Demo;
