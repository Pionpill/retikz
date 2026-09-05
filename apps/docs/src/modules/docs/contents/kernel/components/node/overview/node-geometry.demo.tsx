import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { nodeGeometryControls, nodeGeometryFrame, previewControlContract } from './node-geometry.controls';

export const previewControls = nodeGeometryControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  return (
    <Layout viewBox={nodeGeometryFrame.viewBox}>
      <Node id="A" position={[-150, 0]} shape="circle" style={{ stroke: 'gray', dashed: true }} layout={{ padding: 6 }}>
        a
      </Node>
      <Node
        id="Q"
        position={[...nodeGeometryFrame.subjectPosition]}
        cornerRadius={values.cornerRadius}
        scale={values.scale}
        rotate={values.rotate}
        style={{ fill: '#f97316', stroke: '#c2410c', textColor: 'white' }}
        layout={{
          padding: { x: values.paddingX, y: values.paddingY },
          margin: values.margin,
          minimumSize: { width: values.minimumWidth, height: values.minimumHeight },
        }}
      >
        q
      </Node>
      <Draw way={['A', 'Q']} arrow="->" zIndex={-1} style={{ stroke: 'gray' }} />
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/**
 * Node 几何 playground
 * @description 固定参照节点 a 与可调节点 q 保持同一结构，连接线同时显示 margin、尺寸、缩放与旋转后的边界变化
 */
const Demo: FC = controlledPreview.Component;

export default Demo;
