import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';
import { defineControlledPreview } from '@/modules/docs/preview';

import { nodeShapeControls, previewControlContract } from './node-shape.controls';

export const previewControls = nodeShapeControls;

type NodeShapeValues = PreviewControlValuesFor<typeof nodeShapeControls>;

/** 将面板选项转换为 Node 的 shape 输入 */
const shapeOf = (values: NodeShapeValues) =>
  values.shape === 'polygon' ? { type: 'polygon', params: { sides: values.sides } } : values.shape;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout>
    <Node
      position={[0, 0]}
      shape={shapeOf(values)}
      style={{ fill: '#fed7aa', stroke: '#c2410c', textColor: 'currentColor' }}
      layout={{ minimumSize: { width: 104, height: 64 } }}
    >
      Node
    </Node>
  </Layout>
));

export const previewSource = controlledPreview.source;

/** 通过切换 Core 内置形状观察 Node 的轮廓 */
const Demo: FC = controlledPreview.Component;

export default Demo;
