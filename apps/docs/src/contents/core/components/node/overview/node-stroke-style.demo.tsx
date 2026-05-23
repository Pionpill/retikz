import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * 描边样式预设
 * @description dashed 默认 [4, 2] 短虚线、dotted 默认 [1, 2] 圆点线、dashArray 自定义 pattern 优先级最高。
 */
const Demo: FC = () => (
  <Layout width={460} height={100}>
    <Node id="solid" position={[-160, 0]} strokeWidth={2}>solid</Node>
    <Node id="dashed" position={[-50, 0]} strokeWidth={2} dashed>dashed</Node>
    <Node id="dotted" position={[60, 0]} strokeWidth={2} dotted>dotted</Node>
    <Node id="custom" position={[180, 0]} strokeWidth={2} dashArray={[6, 2, 1, 2]}>
      custom
    </Node>
  </Layout>
);

export default Demo;
