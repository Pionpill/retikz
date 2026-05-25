import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

// 自包含 data URI（橙底白圆），免联网，演示 image 填充
const IMG =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='40'%20height='40'%3E%3Crect%20width='40'%20height='40'%20fill='%23f59e0b'/%3E%3Ccircle%20cx='20'%20cy='20'%20r='13'%20fill='%23ffffff'/%3E%3C/svg%3E";

/**
 * pattern / image 填充
 * @description 斜线 lines（rotation 45）/ 网点 dots / 网格 grid 三种 pattern motif + image 填充（fit cover，data URI）。
 */
const Demo: FC = () => (
  <Layout width={640} height={180}>
    <Node
      id="hatch"
      position={[-225, 0]}
      shape="rectangle"
      minimumWidth={96}
      minimumHeight={80}
      stroke="gray"
      fill={{ type: 'pattern', shape: 'lines', color: 'blue', rotation: 45 }}
    />
    <Node
      id="dots"
      position={[-75, 0]}
      shape="circle"
      minimumSize={84}
      stroke="gray"
      fill={{ type: 'pattern', shape: 'dots', color: 'green', size: 10 }}
    />
    <Node
      id="grid"
      position={[75, 0]}
      shape="rectangle"
      minimumWidth={96}
      minimumHeight={80}
      stroke="gray"
      fill={{ type: 'pattern', shape: 'grid', color: 'blue', size: 10 }}
    />
    <Node
      id="img"
      position={[225, 0]}
      shape="circle"
      minimumSize={84}
      stroke="gray"
      fill={{ type: 'image', href: IMG, fit: 'cover' }}
    />
  </Layout>
);

export default Demo;
