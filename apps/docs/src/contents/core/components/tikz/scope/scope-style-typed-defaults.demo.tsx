import { Layout, Node, Path, Scope, Step } from '@retikz/react';
import type { FC } from 'react';

/**
 * 四通道 every-X：node / path / label / arrow 各自独立默认
 * @description nodeDefault 给节点圆形 + 浅蓝底；pathDefault 给线绿色；arrowDefault 放大箭头；
 *   labelDefault 给边标注紫色。四通道扁平独立、互不干涉。
 */
const Demo: FC = () => (
  <Layout width={420} height={130}>
    <Scope
      nodeDefault={{ shape: 'circle', fill: '#dbeafe' }}
      pathDefault={{ stroke: '#16a34a' }}
      arrowDefault={{ shape: 'stealth', scale: 1.6 }}
      labelDefault={{ textColor: '#9333ea' }}
    >
      <Node id="A" position={[0, 0]}>
        A
      </Node>
      <Node id="B" position={[180, 0]}>
        B
      </Node>
      <Path arrow="->">
        <Step kind="move" to="A" />
        <Step to="B" label={{ text: 'edge' }} />
      </Path>
    </Scope>
  </Layout>
);

export default Demo;
