import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

import { LogicFigureFrame, LogicFigureFrameTitle } from '@/modules/docs/components/logic-figure';

/** Layout 以互斥优先级决定内部坐标，并独立处理页面显示尺寸 */
const Demo: FC = () => (
  <Layout width={620} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
    <LogicFigureFrame id="coordinate-priority">
      <LogicFigureFrameTitle>内部坐标优先级</LogicFigureFrameTitle>
      <Node
        id="viewbox-prop"
        position={[-215, -50]}
        minimumSize={{ width: 150, height: 40 }}
        stroke="darkorange"
        fill="darkorange"
        fillOpacity={0.08}
        cornerRadius={4}
        font={{ size: 13 }}
      >
        1 · 显式 viewBox prop
      </Node>
      <Node
        id="ir-viewbox"
        position={[-20, -50]}
        minimumSize={{ width: 130, height: 40 }}
        stroke="darkorange"
        fill="darkorange"
        fillOpacity={0.08}
        cornerRadius={4}
        font={{ size: 13 }}
      >
        2 · IR viewBox
      </Node>
      <Node
        id="auto-layout"
        position={[175, -50]}
        minimumSize={{ width: 130, height: 40 }}
        stroke="dimgray"
        fill="lightgray"
        fillOpacity={0.16}
        cornerRadius={4}
        font={{ size: 13 }}
      >
        内容边界 + padding
      </Node>
      <Node
        id="coordinate-range"
        position={[-20, 25]}
        minimumSize={{ width: 132, height: 48 }}
        stroke="dodgerblue"
        fill="dodgerblue"
        fillOpacity={0.08}
        cornerRadius={4}
        font={{ size: 13, weight: 'bold' }}
      >
        内部坐标范围
      </Node>
    </LogicFigureFrame>
    <Node
      id="width-height"
      position={[-165, 90]}
      minimumSize={{ width: 118, height: 40 }}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      width / height
    </Node>
    <Node
      id="display-size"
      position={[165, 90]}
      minimumSize={{ width: 132, height: 40 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13, weight: 'bold' }}
    >
      页面显示尺寸
    </Node>

    <Draw way={['viewbox-prop', 'coordinate-range']} arrow="->" stroke="gray" />
    <Draw way={['ir-viewbox', 'coordinate-range']} arrow="->" stroke="gray" />
    <Draw way={['auto-layout', 'coordinate-range']} arrow="->" stroke="gray" />
    <Draw
      way={[
        'viewbox-prop',
        {
          label: {
            text: '缺省',
            position: 'midway',
            side: 'top',
            sloped: false,
            textColor: 'gray',
            font: { size: 10 },
          },
        },
        'ir-viewbox',
      ]}
      arrow="->"
      stroke="gray"
      dashPattern={[4, 3]}
    />
    <Draw
      way={[
        'ir-viewbox',
        {
          label: {
            text: '缺省',
            position: 'midway',
            side: 'top',
            sloped: false,
            textColor: 'gray',
            font: { size: 10 },
          },
        },
        'auto-layout',
      ]}
      arrow="->"
      stroke="gray"
      dashPattern={[4, 3]}
    />
    <Draw way={['width-height', 'display-size']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
