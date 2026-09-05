import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

import { fileShape, FileShapeName } from './layout-file-shape';

/** Layout 注入自定义 ShapeDefinition 的完整闭环 */
const Demo: FC = () => (
  <Layout shapes={[fileShape]}>
    <Node
      id="ir-file"
      position={[-90, 0]}
      shape={FileShapeName}
      text="IR"
      style={{ fill: 'none' }}
      layout={{ minimumSize: { width: 76, height: 96 } }}
    />
    <Node
      id="scene-file"
      position={[90, 0]}
      shape={FileShapeName}
      text="Scene"
      style={{ fill: 'none' }}
      layout={{ minimumSize: { width: 76, height: 96 } }}
    />
    <Draw way={['ir-file', 'scene-file']} arrow="->" />
  </Layout>
);

export default Demo;
