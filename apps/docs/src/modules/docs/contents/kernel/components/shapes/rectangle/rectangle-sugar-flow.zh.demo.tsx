import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Rectangle Sugar 的点位归一与闭合 Path 生成流程图 */
const Demo: FC = () => (
  <Layout width={420} height={330} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="direct-form"
      position={[-115, -105]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      {'corner1 + corner2\n任意 Target'}
    </Node>
    <Node
      id="computed-form"
      position={[115, -105]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      {'center / side / size\n字面量坐标'}
    </Node>
    <Node
      id="corner-calculation"
      position={[115, -30]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      计算两个对角
    </Node>
    <Node
      id="rectangle-step"
      position={[0, 45]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14, weight: 'bold' }}
    >
      rectangle step
    </Node>
    <Node
      id="closed-path"
      position={[0, 115]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      闭合 Path
    </Node>

    <Draw
      way={[
        'direct-form',
        { label: { text: '透传 from / to', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'rectangle-step',
      ]}
      arrow="->"
      stroke="gray"
    />
    <Draw way={['computed-form', 'corner-calculation']} arrow="->" stroke="gray" />
    <Draw
      way={[
        'corner-calculation',
        { label: { text: 'from / to', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'rectangle-step',
      ]}
      arrow="->"
      stroke="gray"
    />
    <Draw way={['rectangle-step', 'closed-path']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
