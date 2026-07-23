import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

import { LogicFrame, LogicFrameTitle } from '@/modules/docs/components/logic-figure';

/** Layout chooses internal coordinates through exclusive precedence and keeps display size separate */
const Demo: FC = () => (
  <Layout width={620} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
    <LogicFrame id="coordinate-priority">
      <LogicFrameTitle>Internal-coordinate precedence</LogicFrameTitle>
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
        1 · explicit viewBox prop
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
        bounds + padding
      </Node>
      <Node
        id="coordinate-range"
        position={[-20, 25]}
        minimumSize={{ width: 142, height: 48 }}
        stroke="dodgerblue"
        fill="dodgerblue"
        fillOpacity={0.08}
        cornerRadius={4}
        font={{ size: 13, weight: 'bold' }}
      >
        internal coordinates
      </Node>
    </LogicFrame>
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
      CSS display size
    </Node>

    <Draw way={['viewbox-prop', 'coordinate-range']} arrow="->" stroke="gray" />
    <Draw way={['ir-viewbox', 'coordinate-range']} arrow="->" stroke="gray" />
    <Draw way={['auto-layout', 'coordinate-range']} arrow="->" stroke="gray" />
    <Draw
      way={[
        'viewbox-prop',
        {
          label: {
            text: 'absent',
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
            text: 'absent',
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
