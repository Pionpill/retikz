import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/** Rectangle Standard 的点位归一与闭合 Path 生成流程图 */
const Demo: FC = () => (
  <Layout>
    <Node
      id="direct-form"
      position={[-115, -105]}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', font: { size: 14 }, opacity: { fill: 0.08 } }}
    >
      {'corner1 + corner2\n任意 Target'}
    </Node>
    <Node
      id="computed-form"
      position={[115, -105]}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', font: { size: 14 }, opacity: { fill: 0.08 } }}
    >
      {'center / side / size\n字面量坐标'}
    </Node>
    <Node
      id="corner-calculation"
      position={[115, -30]}
      cornerRadius={4}
      style={{ stroke: 'dimgray', fill: 'lightgray', font: { size: 14 }, opacity: { fill: 0.16 } }}
    >
      计算两个对角
    </Node>
    <Node
      id="rectangle-step"
      position={[0, 45]}
      cornerRadius={4}
      style={{ stroke: 'dimgray', fill: 'lightgray', font: { size: 14, weight: 'bold' }, opacity: { fill: 0.16 } }}
    >
      rectangle step
    </Node>
    <Node
      id="closed-path"
      position={[0, 115]}
      cornerRadius={4}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', font: { size: 14 }, opacity: { fill: 0.08 } }}
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
      style={{ stroke: 'gray' }}
    />
    <Draw way={['computed-form', 'corner-calculation']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw
      way={[
        'corner-calculation',
        { label: { text: 'from / to', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'rectangle-step',
      ]}
      arrow="->"
      style={{ stroke: 'gray' }}
    />
    <Draw way={['rectangle-step', 'closed-path']} arrow="->" style={{ stroke: 'gray' }} />
  </Layout>
);

export default Demo;
