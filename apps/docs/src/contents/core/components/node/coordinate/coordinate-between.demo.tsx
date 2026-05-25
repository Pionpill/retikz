import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * 比例 partway 定位 `{ between: [A, B], t }`
 * @description A、B 两端点连线上按比例 t 取点：t=0.25 / 0.5 / 0.75 三个橙点随 A、B 移动而保持比例。
 *   端点复用 Target 解析（节点引用 / 坐标 / 极坐标 / 嵌套 between）；同样可用于 Node.position / Coordinate / Step.to。
 */
const Demo: FC = () => (
  <Layout width={360} height={120}>
    <Node id="A" position={[-140, 0]} shape="circle" minimumSize={32} fill="dodgerblue" textColor="white">
      A
    </Node>
    <Node id="B" position={[140, 0]} shape="circle" minimumSize={32} fill="green" textColor="white">
      B
    </Node>
    <Node
      id="q1"
      position={{ between: [{ id: 'A' }, { id: 'B' }], t: 0.25 }}
      shape="circle"
      minimumSize={14}
      fill="darkorange"
    />
    <Node
      id="mid"
      position={{ between: [{ id: 'A' }, { id: 'B' }], t: 0.5 }}
      shape="circle"
      minimumSize={20}
      fill="darkorange"
    />
    <Node
      id="q3"
      position={{ between: [{ id: 'A' }, { id: 'B' }], t: 0.75 }}
      shape="circle"
      minimumSize={14}
      fill="darkorange"
    />
  </Layout>
);

export default Demo;
