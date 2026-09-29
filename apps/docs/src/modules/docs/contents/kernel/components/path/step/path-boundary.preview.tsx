import type { IRBoundary } from '@retikz/core';
import { StarShapeDefinition } from '@retikz/extension';
import { Draw, Layout, Node } from '@retikz/react';
import { Circle } from '@retikz/standard-react/shape';

const StarOuterRadius = 50;

const StarAabbHalfWidth = StarOuterRadius * Math.cos(Math.PI / 10);

type BoundaryChoice = PathBoundaryPreviewValues['boundary'];

type BoundaryFitChoice = PathBoundaryPreviewValues['fit'];

const boundaryOf = (boundary: BoundaryChoice, fit: BoundaryFitChoice, gap: number): IRBoundary =>
  boundary === 'shape' ? boundary : { type: boundary, params: { fit, gap } };

/** 图形参数 */
export type PathBoundaryPreviewValues = {
  fit: 'tight' | 'bounds';
  gap: number;
  boundary: 'circle' | 'shape';
};

/** 绘制示例图形 */
export const PathBoundaryPreview = (values: PathBoundaryPreviewValues) => {
  const baseRadius = values.fit === 'tight' ? StarOuterRadius : Math.hypot(StarAabbHalfWidth, StarOuterRadius);
  const circleBoundaryRadius = baseRadius + values.gap;

  return (
    <Layout
      viewBox={{ x: -180, y: -110, width: 360, height: 220 }}
      extensions={{ shapes: [StarShapeDefinition] }}
      rootScope={{
        defaults: {
          node: {
            style: { stroke: 'gray', dashed: true },
          },
        },
      }}
    >
      <Node
        id="star"
        position={[0, 0]}
        shape={{ type: 'star', params: { points: 5, innerRadius: 20, outerRadius: StarOuterRadius } }}
        style={{ fill: 'gold', stroke: 'none' }}
      />
      {values.boundary === 'circle' && (
        <Circle
          center={[0, 0]}
          radius={circleBoundaryRadius}
          zIndex={1}
          style={{ stroke: '#94a3b8', fill: 'none', dashPattern: [1, 4], lineCap: 'round' }}
        />
      )}
      <Node id="A" position={[-130, 80]}>
        a
      </Node>
      <Draw way={['A', { id: 'star', boundary: boundaryOf(values.boundary, values.fit, values.gap) }]} arrow="->" />
    </Layout>
  );
};
