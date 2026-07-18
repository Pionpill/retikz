import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Node 从 props 收敛到可见图元与命名几何的流程图 */
const Demo: FC = () => (
  <Layout width={560} height={290} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="props"
      position={[-205, -55]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
      text={['Node props', '位置 · 内容 · 几何']}
    />
    <Node
      id="definitions"
      position={[-205, 70]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      shape / boundary 定义
    </Node>
    <Node
      id="layout"
      position={[-10, 0]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 15, weight: 'bold' }}
    >
      Node 布局
    </Node>
    <Node
      id="primitives"
      position={[195, -75]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
      text={['Scene 图元', '形状 · 文字 · 标签']}
    />
    <Node
      id="geometry"
      position={[195, 20]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
      text={['命名几何', 'id · 锚点 · 连接面']}
    />
    <Node
      id="consumers"
      position={[195, 110]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      Path / Draw
    </Node>

    <Draw
      way={[
        'props',
        { label: { text: '解析与测量', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'layout',
      ]}
      arrow="->"
    />
    <Draw way={['definitions', 'layout']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw
      way={[
        'layout',
        { label: { text: '输出', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'primitives',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'layout',
        { label: { text: '注册', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'geometry',
      ]}
      arrow="->"
      stroke="gray"
      dashPattern={[4, 3]}
    />
    <Draw way={['geometry', 'consumers']} arrow="->" />
  </Layout>
);

export default Demo;
