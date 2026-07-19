import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { nodeGeometryControls, nodeGeometryFrame } from './node-geometry.controls';

export const previewControls = nodeGeometryControls;

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

/**
 * Node 几何 playground
 * @description 固定参照节点 a 与可调节点 q 保持同一结构，连接线同时显示 margin、尺寸、缩放与旋转后的边界变化
 */
const Demo: FC = () => {
  const values = usePreviewControls(nodeGeometryControls);

  return (
    <Layout width={500} height={240} viewBox={nodeGeometryFrame.viewBox}>
      <Node id="A" position={[-150, 0]} shape="circle" padding={6} stroke="gray" dashed>
        a
      </Node>
      <Node
        id="Q"
        position={[...nodeGeometryFrame.subjectPosition]}
        padding={{ x: values.paddingX, y: values.paddingY }}
        margin={values.margin}
        minimumSize={{ width: values.minimumWidth, height: values.minimumHeight }}
        cornerRadius={values.cornerRadius}
        scale={values.scale}
        rotate={values.rotate}
        fill="#f97316"
        stroke="#c2410c"
        textColor="white"
      >
        q
      </Node>
      <Draw way={['A', 'Q']} arrow="->" stroke="gray" zIndex={-1} />
    </Layout>
  );
};

export default Demo;
