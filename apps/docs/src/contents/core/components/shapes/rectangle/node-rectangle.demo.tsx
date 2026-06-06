import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * 矩形节点（默认形状）+ 圆角
 * @description rectangle 是默认 shape，边界 = 文字内框；cornerRadius 走 shape params 做圆角。
 */
const Demo: FC = () => (
  <Layout width={360} height={150}>
    <Node id="r1" position={[-90, 0]}>
      rectangle
    </Node>
    <Node
      id="r2"
      position={[90, 0]}
      shape={{ type: 'rectangle', params: { cornerRadius: 10 } }}
      fill="aliceblue"
    >
      rounded
    </Node>
    <Draw way={['r1', 'r2']} arrow="->" />
  </Layout>
);

export default Demo;
