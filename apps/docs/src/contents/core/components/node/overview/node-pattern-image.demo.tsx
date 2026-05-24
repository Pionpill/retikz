import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

// 自包含 data URI（橙底白圆），免联网，演示 image 填充
const IMG =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='40'%20height='40'%3E%3Crect%20width='40'%20height='40'%20fill='%23f59e0b'/%3E%3Ccircle%20cx='20'%20cy='20'%20r='13'%20fill='%23ffffff'/%3E%3C/svg%3E";

/**
 * pattern / image 填充
 * @description 左：斜线 pattern（rotation 45）；中：网点 pattern；右：image 填充（fit cover，data URI）。
 */
const Demo: FC = () => (
  <Layout width={520} height={180}>
    <Node
      id="hatch"
      position={[-165, 0]}
      shape="rectangle"
      minimumWidth={100}
      minimumHeight={80}
      stroke="#888888"
      fill={{ type: 'pattern', shape: 'lines', color: '#1466a8', rotation: 45 }}
    />
    <Node
      id="dots"
      position={[-30, 0]}
      shape="circle"
      minimumSize={84}
      stroke="#888888"
      fill={{ type: 'pattern', shape: 'dots', color: '#16a34a', size: 10 }}
    />
    <Node
      id="img"
      position={[120, 0]}
      shape="circle"
      minimumSize={84}
      stroke="#888888"
      fill={{ type: 'image', href: IMG, fit: 'cover' }}
    />
  </Layout>
);

export default Demo;
