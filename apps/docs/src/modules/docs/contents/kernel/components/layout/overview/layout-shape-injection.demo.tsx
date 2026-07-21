import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

import { fileShape, FileShapeName } from './layout-file-shape';

/** Layout 注入自定义 ShapeDefinition 的完整闭环 */
const Demo: FC = () => (
  <Layout width={320} height={130} shapes={[fileShape]}>
    <Node
      id="ir-file"
      position={[-90, 0]}
      shape={FileShapeName}
      minimumSize={{ width: 76, height: 96 }}
      text="IR"
      fill="none"
    />
    <Node
      id="scene-file"
      position={[90, 0]}
      shape={FileShapeName}
      minimumSize={{ width: 76, height: 96 }}
      text="Scene"
      fill="none"
    />
    <Draw way={['ir-file', 'scene-file']} arrow="->" />
  </Layout>
);

export default Demo;
