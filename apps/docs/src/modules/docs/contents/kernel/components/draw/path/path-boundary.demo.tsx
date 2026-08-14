import type { IRBoundary } from '@retikz/core';
import type { FC } from 'react';

import { Circle, Draw, Layout, Node } from '@retikz/react';
import { StarShapeDefinition } from '@retikz/standard/shape';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { defineControlledPreview } from '@/modules/docs/preview';

import { pathBoundaryControls, previewControlContract } from './path-boundary.controls';

export const previewControls = pathBoundaryControls;

const StarOuterRadius = 50;
const StarAabbHalfWidth = StarOuterRadius * Math.cos(Math.PI / 10);

type PathBoundaryValues = PreviewControlValuesFor<typeof pathBoundaryControls>;
type BoundaryChoice = PathBoundaryValues['boundary'];
type BoundaryFitChoice = PathBoundaryValues['fit'];

/** 把面板值转换为 endpoint 的公开 boundary 引用 */
const boundaryOf = (boundary: BoundaryChoice, fit: BoundaryFitChoice, gap: number): IRBoundary =>
  boundary === 'shape' ? boundary : { type: boundary, params: { fit, gap } };

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const baseRadius = values.fit === 'tight' ? StarOuterRadius : Math.hypot(StarAabbHalfWidth, StarOuterRadius);
  const circleBoundaryRadius = baseRadius + values.gap;

  return (
    <Layout
      width={360}
      height={220}
      viewBox={{ x: -180, y: -110, width: 360, height: 220 }}
      nodeDefault={{ stroke: 'gray', dashed: true }}
      shapes={[StarShapeDefinition]}
    >
      <Node
        id="star"
        position={[0, 0]}
        shape={{ type: 'star', params: { points: 5, innerRadius: 20, outerRadius: StarOuterRadius } }}
        fill="gold"
        stroke="none"
      />
      {values.boundary === 'circle' && (
        <Circle
          center={[0, 0]}
          radius={circleBoundaryRadius}
          stroke="#94a3b8"
          fill="none"
          dashPattern={[1, 4]}
          lineCap="round"
          zIndex={1}
        />
      )}
      <Node id="A" position={[-130, 80]}>
        a
      </Node>
      <Draw way={['A', { id: 'star', boundary: boundaryOf(values.boundary, values.fit, values.gap) }]} arrow="->" />
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/**
 * 端点 boundary：单边覆盖
 * @description 固定一条边，在面板切换目标端点的视觉轮廓 / 圆形连接面，并调整 fit 与 gap
 */
const Demo: FC = controlledPreview.Component;

export default Demo;
