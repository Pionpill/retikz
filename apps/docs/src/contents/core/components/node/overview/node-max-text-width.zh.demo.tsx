import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * maxTextWidth 折行阈值
 * @description 左：不设 maxTextWidth，长文本一行铺开；右：设 maxTextWidth，超阈值按字折行、盒宽收缩到内容。
 */
const Demo: FC = () => (
  <Layout width={540} height={200}>
    <Node id="wide" position={[-120, 20]} fill="#eef2ff" stroke="#8893d8">
      较长的节点说明文字
    </Node>
    <Node id="wrapped" position={[140, 20]} maxTextWidth={84} fill="#eafaf0" stroke="#74b48a">
      较长的节点说明文字
    </Node>
    <Node position={[-120, 88]} stroke="none" fill="none" textColor="gray" font={{ size: 12 }}>
      无 maxTextWidth
    </Node>
    <Node position={[140, 88]} stroke="none" fill="none" textColor="gray" font={{ size: 12 }}>
      maxTextWidth=84
    </Node>
  </Layout>
);

export default Demo;
