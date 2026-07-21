import type { FC } from 'react';

import { Draw, Layout, Node, Scope } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract,scopeIdReferenceControls } from './scope-id-reference.controls';

/** controls registry 未刷新时供 ComponentPreview 从 demo 模块直接解析的兜底定义 */
export const previewControls = scopeIdReferenceControls;

const RECTANGLE_BOUNDARY = [
  'cluster.top-left',
  'cluster.top-right',
  'cluster.bottom-right',
  'cluster.bottom-left',
  'cluster.top-left',
];

const CIRCLE_BOUNDARY = [...Array.from({ length: 36 }, (_, index) => `cluster.${index * 10}`), 'cluster.0'];

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const boundary = values.boundingShape === 'circle' ? CIRCLE_BOUNDARY : RECTANGLE_BOUNDARY;
  const anchor = values.anchor === 'angle' ? values.angleDegrees : values.anchor;

  return (
    <Layout width={400} height={200} viewBox={{ x: -240, y: -120, width: 480, height: 240 }}>
      <Node id="source" position={[-150, 0]}>
        source
      </Node>
      <Scope id="cluster" boundingShape={values.boundingShape} transforms={[{ kind: 'translate', x: 80, y: 0 }]}>
        <Node id="A" position={[-45, -35]}>
          A
        </Node>
        <Node id="B" position={[45, -35]}>
          B
        </Node>
        <Node id="C" position={[0, 45]}>
          C
        </Node>
      </Scope>
      <Draw way={boundary} stroke="gray" dashPattern={[1, 4]} lineCap="round" />
      <Draw way={['source', `cluster.${anchor}`]} arrow="->" />
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/**
 * Scope 整体引用与输出边界 playground
 * @description 外部 source 只连接 scope.id 生成的整体目标；面板切换 synthetic 包络形状和命名 / 数字角度 anchor，不改变 children
 */
const Demo: FC = controlledPreview.Component;

export default Demo;
