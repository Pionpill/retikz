import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

import { LogicFigureFrame, LogicFigureFrameTitle } from '@/modules/docs/components/logic-figure';

/** Layout chooses internal coordinates through exclusive precedence and keeps display size separate */
const Demo: FC = () => (
  <Layout>
    <LogicFigureFrame id="coordinate-priority">
      <LogicFigureFrameTitle>Internal-coordinate precedence</LogicFigureFrameTitle>
      <Node
        id="viewbox-prop"
        position={[-215, -50]}
        cornerRadius={4}
        style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08, font: { size: 13 } }}
        layout={{ minimumSize: { width: 150, height: 40 } }}
      >
        1 · explicit viewBox prop
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
        bounds + padding
      </Node>
      <Node
        id="coordinate-range"
        position={[-20, 25]}
        cornerRadius={4}
        style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08, font: { size: 13, weight: 'bold' } }}
        layout={{ minimumSize: { width: 142, height: 48 } }}
      >
        internal coordinates
      </Node>
    </LogicFigureFrame>
    <Node
      id="width-height"
      position={[-165, 90]}
      cornerRadius={4}
      style={{ stroke: 'dimgray', fill: 'lightgray', fillOpacity: 0.16, font: { size: 13 } }}
      layout={{ minimumSize: { width: 118, height: 40 } }}
    >
      Natural content size
    </Node>
    <Node
      id="display-size"
      position={[165, 90]}
      cornerRadius={4}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08, font: { size: 13, weight: 'bold' } }}
      layout={{ minimumSize: { width: 132, height: 40 } }}
    >
      CSS display size
    </Node>

    <Draw way={['viewbox-prop', 'coordinate-range']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['ir-viewbox', 'coordinate-range']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['auto-layout', 'coordinate-range']} arrow="->" style={{ stroke: 'gray' }} />
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
      style={{ stroke: 'gray', dashPattern: [4, 3] }}
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
      style={{ stroke: 'gray', dashPattern: [4, 3] }}
    />
    <Draw way={['width-height', 'display-size']} arrow="->" style={{ stroke: 'gray' }} />
  </Layout>
);

export default Demo;
