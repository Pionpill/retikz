import type { IRBoundary } from '@retikz/core';
import { SectorShapeDefinition, StarShapeDefinition } from '@retikz/extension';
import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

import type { BoundaryChoice, BoundaryFitChoice, ShapeChoice } from './primitive-model-playground-boundary';
import { nodeShapeOf, primitiveModelBoundaryGuideShape } from './primitive-model-playground-boundary';

const SOURCE_DISTANCE = 120;

const sourcePositionOf = (angle: number): [number, number] => {
  const radians = (angle * Math.PI) / 180;
  return [Math.cos(radians) * SOURCE_DISTANCE, Math.sin(radians) * SOURCE_DISTANCE];
};

const boundaryOf = (boundary: BoundaryChoice, fit: BoundaryFitChoice, gap: number): IRBoundary =>
  boundary === 'shape' ? boundary : { type: boundary, params: { fit, gap } };

type BoundaryGuideProps = {
  shape: ShapeChoice;
  boundary: BoundaryChoice;
  fit: BoundaryFitChoice;
  gap: number;
  children: string;
};

const BoundaryGuide: FC<BoundaryGuideProps> = props => {
  const { shape, boundary, fit, gap, children } = props;
  if (boundary === 'shape') return null;

  return (
    <Node
      position={[0, 0]}
      shape={{ type: primitiveModelBoundaryGuideShape.name, params: { shape, boundary, fit, gap } }}
      zIndex={1}
      style={{
        fill: 'none',
        stroke: '#94a3b8',
        strokeOpacity: 0.75,
        strokeWidth: 1,
        dashPattern: [6, 4],
        textColor: 'transparent',
      }}
      layout={{ padding: { x: 14, y: 10 }, minimumSize: { width: 72, height: 48 } }}
    >
      {children}
    </Node>
  );
};

/** 图形参数 */
export type PrimitiveModelPlaygroundPreviewValues = {
  sourceAngle: number;
  shape: 'star' | 'circle' | 'rectangle' | 'ellipse' | 'diamond' | 'polygon' | 'sector';
  boundary: 'circle' | 'shape' | 'rectangle' | 'ellipse';
  fit: 'tight' | 'bounds';
  gap: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  content: string;
};

/** 绘制示例图形 */
export const PrimitiveModelPlaygroundPreview = (values: PrimitiveModelPlaygroundPreviewValues) => {
  const sourcePosition = sourcePositionOf(values.sourceAngle);

  return (
    <Layout
      viewBox={{ x: -175, y: -145, width: 350, height: 290 }}
      extensions={{ shapes: [primitiveModelBoundaryGuideShape, SectorShapeDefinition, StarShapeDefinition] }}
    >
      <Draw
        way={[[0, 0], sourcePosition]}
        zIndex={-3}
        style={{ stroke: 'lightgray', dashPattern: [1, 4], lineCap: 'round' }}
      />
      <Node
        id="T"
        position={[0, 0]}
        shape={nodeShapeOf(values.shape)}
        boundary={boundaryOf(values.boundary, values.fit, values.gap)}
        style={{ fill: values.fill, stroke: values.stroke, strokeWidth: values.strokeWidth, textColor: '#172033' }}
        layout={{ padding: { x: 14, y: 10 }, minimumSize: { width: 72, height: 48 } }}
      >
        {values.content}
      </Node>
      <BoundaryGuide shape={values.shape} boundary={values.boundary} fit={values.fit} gap={values.gap}>
        {values.content}
      </BoundaryGuide>
      <Node
        id="A"
        position={sourcePosition}
        shape="circle"
        style={{ fill: '#64748b', stroke: 'none' }}
        layout={{ minimumSize: 16 }}
      />
      <Draw way={['A', 'T']} arrow="->" zIndex={-1} style={{ stroke: '#64748b' }} />
    </Layout>
  );
};
