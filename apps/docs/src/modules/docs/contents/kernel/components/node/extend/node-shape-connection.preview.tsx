import type { IRBoundary, IRNodeTarget } from '@retikz/core';
import { SectorShapeDefinition, StarShapeDefinition } from '@retikz/extension';
import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

import type { NodeBoundaryChoice, NodeShapeChoice } from './node-shape-connection-boundary';
import { boundaryGuideShape, nodeShapeOf } from './node-shape-connection-boundary';

type AnchorChoice = NodeShapeConnectionPreviewValues['anchorA'];

type BoundaryFitChoice = NodeShapeConnectionPreviewValues['fitA'];

const targetOf = (id: string, anchor: AnchorChoice): IRNodeTarget => ({
  id,
  ...(anchor === 'auto' ? {} : { anchor }),
});

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

const BoundaryGuide: FC<BoundaryGuideProps> = props => {
  const { position, shape, boundary, fit, gap, children } = props;
  return (
    <Node
      position={position}
      shape={{ type: boundaryGuideShape.name, params: { shape, boundary, fit, gap } }}
      zIndex={1}
      style={{
        fill: 'none',
        stroke: '#94a3b8',
        strokeOpacity: 0.6,
        strokeWidth: 1,
        dashPattern: [1, 4],
        textColor: 'transparent',
      }}
    >
      {children}
    </Node>
  );
};

/** 图形参数 */
export type NodeShapeConnectionPreviewValues = {
  shapeA: 'star' | 'rectangle' | 'circle' | 'ellipse' | 'diamond' | 'polygon' | 'sector';
  boundaryA: 'rectangle' | 'circle' | 'ellipse' | 'shape';
  fitA: 'tight' | 'bounds';
  gapA: number;
  shapeB: 'star' | 'rectangle' | 'circle' | 'ellipse' | 'diamond' | 'polygon' | 'sector';
  boundaryB: 'rectangle' | 'circle' | 'ellipse' | 'shape';
  fitB: 'tight' | 'bounds';
  gapB: number;
  anchorA:
    | 'center'
    | 'top'
    | 'top-right'
    | 'right'
    | 'bottom-right'
    | 'bottom'
    | 'bottom-left'
    | 'left'
    | 'top-left'
    | 'auto';
  anchorB:
    | 'center'
    | 'top'
    | 'top-right'
    | 'right'
    | 'bottom-right'
    | 'bottom'
    | 'bottom-left'
    | 'left'
    | 'top-left'
    | 'auto';
};

/** 绘制示例图形 */
export const NodeShapeConnectionPreview = (values: NodeShapeConnectionPreviewValues) => {
  return (
    <Layout extensions={{ shapes: [boundaryGuideShape, SectorShapeDefinition, StarShapeDefinition] }}>
      <Node
        id="A"
        position={[-150, 0]}
        shape={nodeShapeOf(values.shapeA)}
        boundary={boundaryOf(values.boundaryA, values.fitA, values.gapA)}
        style={{ fill: '#fbbf24', stroke: '#b45309', textColor: '#78350f' }}
      >
        a
      </Node>
      <Node
        id="B"
        position={[150, 0]}
        shape={nodeShapeOf(values.shapeB)}
        boundary={boundaryOf(values.boundaryB, values.fitB, values.gapB)}
        style={{ fill: '#93c5fd', stroke: '#1d4ed8', textColor: '#1e3a8a' }}
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
      <Draw
        way={[targetOf('A', values.anchorA), targetOf('B', values.anchorB)]}
        arrow="->"
        zIndex={-1}
        style={{ stroke: 'gray' }}
      />
    </Layout>
  );
};
