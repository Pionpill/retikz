import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/**
 * CSS-like padding 与 margin 差异
 * @description 默认 padding 走 8 兜底；padding=16 对称、padding={{x,y}} button 风格扁宽、margin=12 border 不变但 path 端点提前 12 user units 停下，靠末尾一条 Draw 演示。
 */
const Demo: FC = () => (
  <Layout width={540} height={140}>
    <Node id="def" position={[-200, 0]}>
      default
    </Node>
    <Node id="sym" position={[-70, 0]} padding={16}>
      padding=16
    </Node>
    <Node id="wide" position={[80, 0]} padding={{ x: 24, y: 4 }}>
      button
    </Node>
    <Node id="outer" position={[220, 0]} margin={12}>
      margin=12
    </Node>
    <Draw way={['outer', 'wide']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
