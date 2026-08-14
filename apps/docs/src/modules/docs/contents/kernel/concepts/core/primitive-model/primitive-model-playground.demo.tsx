import type { IRBoundary } from '@retikz/core';
import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';
import { SectorShapeDefinition, StarShapeDefinition } from '@retikz/standard/shape';

import { defineControlledPreview } from '@/modules/docs/preview';

import type { BoundaryChoice, BoundaryFitChoice, ShapeChoice } from './primitive-model-playground-boundary';

import { previewControlContract, primitiveModelPlaygroundControls } from './primitive-model-playground.controls';
import { nodeShapeOf, primitiveModelBoundaryGuideShape } from './primitive-model-playground-boundary';

export const previewControls = primitiveModelPlaygroundControls;

const SOURCE_DISTANCE = 120;

/** 把轨道角度转换为固定半径上的来源坐标 */
const sourcePositionOf = (angle: number): [number, number] => {
  const radians = (angle * Math.PI) / 180;
  return [Math.cos(radians) * SOURCE_DISTANCE, Math.sin(radians) * SOURCE_DISTANCE];
};

/** 把面板值转换为 Node 的公开连接面引用 */
const boundaryOf = (boundary: BoundaryChoice, fit: BoundaryFitChoice, gap: number): IRBoundary =>
  boundary === 'shape' ? boundary : { type: boundary, params: { fit, gap } };

type BoundaryGuideProps = {
  shape: ShapeChoice;
  boundary: BoundaryChoice;
  fit: BoundaryFitChoice;
  gap: number;
  children: string;
};

/** 在可见 Node 上方绘制当前规则连接面的浅灰虚线轮廓 */
const BoundaryGuide: FC<BoundaryGuideProps> = props => {
  const { shape, boundary, fit, gap, children } = props;
  if (boundary === 'shape') return null;

  return (
    <Node
      position={[0, 0]}
      shape={{ type: primitiveModelBoundaryGuideShape.name, params: { shape, boundary, fit, gap } }}
      padding={{ x: 14, y: 10 }}
      minimumSize={{ width: 72, height: 48 }}
      fill="none"
      stroke="#94a3b8"
      strokeOpacity={0.75}
      strokeWidth={1}
      dashPattern={[6, 4]}
      textColor="transparent"
      zIndex={1}
    >
      {children}
    </Node>
  );
};

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const sourcePosition = sourcePositionOf(values.sourceAngle);

  return (
    <Layout
      width={400}
      height={300}
      viewBox={{ x: -175, y: -145, width: 350, height: 290 }}
      shapes={[primitiveModelBoundaryGuideShape, SectorShapeDefinition, StarShapeDefinition]}
    >
      <Draw way={[[0, 0], sourcePosition]} stroke="lightgray" dashPattern={[1, 4]} lineCap="round" zIndex={-3} />
      <Node
        id="T"
        position={[0, 0]}
        shape={nodeShapeOf(values.shape)}
        boundary={boundaryOf(values.boundary, values.fit, values.gap)}
        padding={{ x: 14, y: 10 }}
        minimumSize={{ width: 72, height: 48 }}
        fill={values.fill}
        stroke={values.stroke}
        strokeWidth={values.strokeWidth}
        textColor="#172033"
      >
        {values.content}
      </Node>
      <BoundaryGuide shape={values.shape} boundary={values.boundary} fit={values.fit} gap={values.gap}>
        {values.content}
      </BoundaryGuide>
      <Node id="A" position={sourcePosition} shape="circle" minimumSize={16} fill="#64748b" stroke="none" />
      <Draw way={['A', 'T']} arrow="->" stroke="#64748b" zIndex={-1} />
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/**
 * 图元模型 playground
 * @description 固定目标位置、来源轨道与取景，交互比较图元内容、内置 shape、连接面和基础样式
 */
const Demo: FC = controlledPreview.Component;

export default Demo;
