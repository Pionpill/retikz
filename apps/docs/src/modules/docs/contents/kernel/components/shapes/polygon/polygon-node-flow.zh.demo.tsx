import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Node polygon 从内容内框收敛为渲染与连接轮廓的局部流程图 */
const Demo: FC = () => (
  <Layout width={390} height={360} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="inner-box"
      position={[0, -140]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      文字 + padding
    </Node>
    <Node
      id="shape-params"
      position={[-125, -60]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      sides + rotate
    </Node>
    <Node
      id="diamond"
      position={[-125, 30]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      diamond 预设
    </Node>
    <Node
      id="fit"
      position={[0, -60]}
      text={['计算', '外接半径']}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14, weight: 'bold' }}
    />
    <Node
      id="rounding"
      position={[125, 35]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      cornerRadius
    </Node>
    <Node
      id="contour"
      position={[0, 35]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      圆角轮廓
    </Node>
    <Node
      id="scene-path"
      position={[-85, 135]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      Scene Path
    </Node>
    <Node
      id="boundary-hit"
      position={[85, 135]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      边界交点
    </Node>

    <Draw way={['inner-box', 'fit']} arrow="->" stroke="gray" />
    <Draw way={['shape-params', 'fit']} arrow="->" stroke="gray" />
    <Draw
      way={[
        'diamond',
        { label: { text: '4 / 0', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'shape-params',
      ]}
      arrow="->"
      stroke="gray"
      dashPattern={[4, 3]}
    />
    <Draw
      way={[
        'fit',
        { label: { text: '外接', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'contour',
      ]}
      arrow="->"
      stroke="gray"
    />
    <Draw
      way={[
        'rounding',
        { label: { text: '倒角', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'contour',
      ]}
      arrow="->"
      stroke="gray"
      dashPattern={[4, 3]}
    />
    <Draw
      way={[
        'contour',
        { label: { text: '输出', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'scene-path',
      ]}
      arrow="->"
      stroke="gray"
    />
    <Draw
      way={[
        'contour',
        { label: { text: '求交', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'boundary-hit',
      ]}
      arrow="->"
      stroke="gray"
    />
  </Layout>
);

export default Demo;
