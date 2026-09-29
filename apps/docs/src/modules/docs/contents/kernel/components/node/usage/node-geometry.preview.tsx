import { Draw, Layout, Node } from '@retikz/react';

import { nodeGeometryFrame } from './node-geometry.controls';

/** 图形参数 */
export type NodeGeometryPreviewValues = {
  cornerRadius: number;
  scale: number;
  rotate: number;
  paddingX: number;
  paddingY: number;
  margin: number;
  minimumWidth: number;
  minimumHeight: number;
};

/** 绘制示例图形 */
export const NodeGeometryPreview = (values: NodeGeometryPreviewValues) => {
  return (
    <Layout>
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
};
