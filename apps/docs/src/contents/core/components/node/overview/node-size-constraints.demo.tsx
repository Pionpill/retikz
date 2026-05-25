import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * 尺寸约束 + 圆角
 * @description roundedCorners 圆角（仅 rectangle）、minimumSize 对称最小宽高、minimumWidth/Height 分轴最小尺寸（button 风格）、scale 均匀放大整个 node 含字号。
 */
const Demo: FC = () => (
  <Layout width={560} height={140}>
    <Node id="round" position={[-200, 0]} roundedCorners={10} fill="lightgray">
      rounded
    </Node>
    <Node id="msize" position={[-70, 0]} minimumSize={60} fill="lightgray">
      hi
    </Node>
    <Node id="btn" position={[80, 0]} minimumWidth={120} minimumHeight={28} roundedCorners={6} fill="darkorange" textColor="white">
      Submit
    </Node>
    <Node id="big" position={[230, 0]} scale={1.5} fill="lightgray">
      scale=1.5
    </Node>
  </Layout>
);

export default Demo;
