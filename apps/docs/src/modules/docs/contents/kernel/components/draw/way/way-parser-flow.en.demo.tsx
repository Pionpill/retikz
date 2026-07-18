import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** way item 按序展开为 Path + Step 的局部流程图 */
const Demo: FC = () => (
  <Layout width={620} height={250} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="items"
      position={[-250, -25]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      WayItem[]
    </Node>
    <Node
      id="classify"
      position={[-125, -25]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      Classify item
    </Node>
    <Node
      id="consume"
      position={[5, -25]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14, weight: 'bold' }}
    >
      Consume rule
    </Node>
    <Node
      id="steps"
      position={[135, -25]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      IRStep[]
    </Node>
    <Node
      id="path"
      position={[260, -25]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      Path + Step
    </Node>
    <Node
      id="pending-label"
      position={[-55, 45]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      Pending label
    </Node>

    <Draw
      way={[
        'items',
        { label: { text: 'scan', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'classify',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'classify',
        { label: { text: 'kind', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'consume',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'consume',
        { label: { text: 'emit', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'steps',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'steps',
        { label: { text: 'expand', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'path',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'classify',
        { label: { text: 'label', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'pending-label',
      ]}
      arrow="->"
      stroke="gray"
      dashPattern={[4, 3]}
    />
    <Draw way={['pending-label', 'consume']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
