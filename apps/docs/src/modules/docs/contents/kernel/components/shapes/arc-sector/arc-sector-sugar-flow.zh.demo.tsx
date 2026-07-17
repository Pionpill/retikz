import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Arc / Sector Sugar 展开为 Path + Step 的局部流程图 */
const Demo: FC = () => (
  <Layout width={580} height={300} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="props"
      position={[-215, 0]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      Arc / Sector props
    </Node>
    <Node
      id="select"
      position={[-65, 0]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 13, weight: 'bold' }}
    >
      {'角度解析\n形态选择'}
    </Node>
    <Node
      id="open"
      position={[150, -75]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 12 }}
    >
      {'开放 Arc\nmove → arc'}
    </Node>
    <Node
      id="closed"
      position={[150, 0]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 12 }}
    >
      {'闭合 Arc / 实心 Sector\nmove → circlePath | ellipsePath'}
    </Node>
    <Node
      id="hollow"
      position={[150, 75]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 12 }}
    >
      {'空心 Sector\n外弧 → line → 内弧（反向）→ line'}
    </Node>

    <Draw
      way={[
        'props',
        { label: { text: '解析', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'select',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'select',
        { label: { text: 'open', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'open',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'select',
        { label: { text: '闭合 / 实心', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'closed',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'select',
        { label: { text: 'innerRadius', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'hollow',
      ]}
      arrow="->"
    />
  </Layout>
);

export default Demo;
