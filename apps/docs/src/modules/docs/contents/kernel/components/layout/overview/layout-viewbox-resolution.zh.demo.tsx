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
        cornerRadius={4}
        style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08, font: { size: 13 } }}
        layout={{ minimumSize: { width: 150, height: 40 } }}
      >
        1 · 显式 viewBox prop
      </Node>
      <Node
        id="ir-viewbox"
        position={[-20, -50]}
        cornerRadius={4}
        style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08, font: { size: 13 } }}
        layout={{ minimumSize: { width: 130, height: 40 } }}
      >
        2 · IR viewBox
      </Node>
      <Node
        id="auto-layout"
        position={[175, -50]}
        cornerRadius={4}
        style={{ stroke: 'dimgray', fill: 'lightgray', fillOpacity: 0.16, font: { size: 13 } }}
        layout={{ minimumSize: { width: 130, height: 40 } }}
      >
        内容边界 + padding
      </Node>
      <Node
        id="coordinate-range"
        position={[-20, 25]}
        cornerRadius={4}
        style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08, font: { size: 13, weight: 'bold' } }}
        layout={{ minimumSize: { width: 132, height: 48 } }}
      >
        内部坐标范围
      </Node>
    </LogicFigureFrame>
    <Node
      id="width-height"
      position={[-165, 90]}
      cornerRadius={4}
      style={{ stroke: 'dimgray', fill: 'lightgray', fillOpacity: 0.16, font: { size: 13 } }}
      layout={{ minimumSize: { width: 118, height: 40 } }}
    >
      width / height
    </Node>
    <Node
      id="display-size"
      position={[165, 90]}
      cornerRadius={4}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08, font: { size: 13, weight: 'bold' } }}
      layout={{ minimumSize: { width: 132, height: 40 } }}
    >
      页面显示尺寸
    </Node>

    <Draw way={['viewbox-prop', 'coordinate-range']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['ir-viewbox', 'coordinate-range']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['auto-layout', 'coordinate-range']} arrow="->" style={{ stroke: 'gray' }} />
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
      style={{ stroke: 'gray', dashPattern: [4, 3] }}
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
      style={{ stroke: 'gray', dashPattern: [4, 3] }}
    />
    <Draw way={['width-height', 'display-size']} arrow="->" style={{ stroke: 'gray' }} />
  </Layout>
);

export default Demo;
