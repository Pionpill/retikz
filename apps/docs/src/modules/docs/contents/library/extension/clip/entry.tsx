import { CircleClipDefinition } from '@retikz/extension';
import { Layout, Node, Scope } from '@retikz/react';
import type { FC } from 'react';

/** 展示按需装配后的圆形裁剪 */
const Entry: FC = () => (
  <Layout viewBox={{ x: -100, y: -75, width: 200, height: 150 }} extensions={{ clips: [CircleClipDefinition] }}>
    <Scope clip={{ kind: 'circle', cx: 0, cy: 0, r: 50 }}>
      <Node
        layout={{ minimumSize: { width: 160, height: 120 } }}
        style={{ stroke: 'none', fill: { kind: 'pattern', shape: 'grid', color: '#2563eb', size: 14 } }}
      />
    </Scope>
  </Layout>
);

export default Entry;
