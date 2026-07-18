import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Coordinate 登记与两类引用时机的编译流程图 */
const Demo: FC = () => (
  <Layout width={700} height={230} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="coordinate-ir"
      position={[-270, -55]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.1}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      Coordinate IR
    </Node>
    <Node
      id="resolve-position"
      position={[-100, -55]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      立即解析 position
    </Node>
    <Node
      id="zero-layout"
      position={[75, -55]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14, weight: 'bold' }}
    >
      {'零尺寸几何记录\n宽 = 0，高 = 0'}
    </Node>
    <Node
      id="namespace"
      position={[255, -55]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      当前 namespace
    </Node>

    <Node
      id="position-consumer"
      position={[0, 55]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      {'Node / Coordinate\n定位引用'}
    </Node>
    <Node
      id="path-consumer"
      position={[170, 55]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      {'Path target\n端点引用'}
    </Node>

    <Draw way={['coordinate-ir', 'resolve-position']} arrow="->" />
    <Draw way={['resolve-position', 'zero-layout']} arrow="->" />
    <Draw way={['zero-layout', 'namespace']} arrow="->" />
    <Draw
      way={[
        'position-consumer',
        { label: { text: '遍历时 lookup', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'namespace',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'path-consumer',
        { label: { text: '登记后 lookup', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'namespace',
      ]}
      arrow="->"
    />
  </Layout>
);

export default Demo;
