import type { FC } from 'react';

import { Draw, Layout, Node, Rectangle } from '@retikz/react';

const BOX_HALF_WIDTH = 100;
const BOX_HALF_HEIGHT = 55;
const CONTENT_WIDTH = 150;
const CONTENT_HEIGHT = 70;
const ALLOCATION_WIDTH = 90;
const ALLOCATION_HEIGHT = 34;
const VISUAL_WIDTH = 170;
const VISUAL_HEIGHT = 50;
const TITLE_FONT = { size: 14, weight: 'bold' as const };
const NOTE_FONT = { size: 12 };

/** Geometry of the Cell box, content area, child allocation, and final visible bounds */
const Demo: FC = () => (
  <Layout
    width={540}
    height={200}
    viewBox={{ x: -270, y: -100, width: 540, height: 200 }}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    {/* Two horizontal and vertical lines provide only the central Cell's table context */}
    <Draw
      way={[
        [-BOX_HALF_WIDTH, -80],
        [-BOX_HALF_WIDTH, 80],
      ]}
      style={{ stroke: 'currentColor' }}
    />
    <Draw
      way={[
        [BOX_HALF_WIDTH, -80],
        [BOX_HALF_WIDTH, 80],
      ]}
      style={{ stroke: 'currentColor' }}
    />
    <Draw
      way={[
        [-140, -BOX_HALF_HEIGHT],
        [140, -BOX_HALF_HEIGHT],
      ]}
      style={{ stroke: 'currentColor' }}
    />
    <Draw
      way={[
        [-140, BOX_HALF_HEIGHT],
        [140, BOX_HALF_HEIGHT],
      ]}
      style={{ stroke: 'currentColor' }}
    />

    {/* contentBox: content area after removing padding from the box */}
    <Rectangle
      center={[0, 0]}
      width={CONTENT_WIDTH}
      height={CONTENT_HEIGHT}
      style={{ fill: 'none', stroke: 'gray', dashPattern: [4, 3] }}
    />

    {/* visualOverflowBounds: visible bounds after applying visible or clip */}
    <Rectangle
      center={[25, 0]}
      width={VISUAL_WIDTH}
      height={VISUAL_HEIGHT}
      style={{ fill: 'none', stroke: 'darkorange', dashPattern: [4, 3] }}
    />

    {/* contentAllocationBounds: content allocation after fit and alignment */}
    <Rectangle
      center={[12, 0]}
      width={ALLOCATION_WIDTH}
      height={ALLOCATION_HEIGHT}
      style={{ fill: 'dodgerblue', fillOpacity: 0.08, stroke: 'dodgerblue' }}
    />
    <Node position={[12, 0]} style={{ stroke: 'none', font: NOTE_FONT }} layout={{ padding: 0 }}>
      child
    </Node>

    <Node position={[-202, -66]} style={{ stroke: 'none', font: TITLE_FONT }} layout={{ padding: 0 }}>
      box
    </Node>
    <Node position={[-202, -46]} style={{ stroke: 'none', textColor: 'gray', font: NOTE_FONT }} layout={{ padding: 0 }}>
      tracks + gap + span
    </Node>
    <Draw
      way={[
        [-150, -53],
        [-100, -40],
      ]}
      arrow="->"
      style={{ stroke: 'currentColor' }}
    />

    <Node position={[-202, 46]} style={{ stroke: 'none', font: TITLE_FONT }} layout={{ padding: 0 }}>
      contentBox
    </Node>
    <Node position={[-202, 66]} style={{ stroke: 'none', textColor: 'gray', font: NOTE_FONT }} layout={{ padding: 0 }}>
      box − padding
    </Node>
    <Draw
      way={[
        [-148, 53],
        [-75, 29],
      ]}
      arrow="->"
      style={{ stroke: 'gray' }}
    />

    <Node position={[202, -66]} style={{ stroke: 'none', font: TITLE_FONT }} layout={{ padding: 0 }}>
      content allocation
    </Node>
    <Node position={[202, -46]} style={{ stroke: 'none', textColor: 'gray', font: NOTE_FONT }} layout={{ padding: 0 }}>
      fit → alignment
    </Node>
    <Draw
      way={[
        [150, -53],
        [57, -17],
      ]}
      arrow="->"
      style={{ stroke: 'dodgerblue' }}
    />

    <Node position={[202, 46]} style={{ stroke: 'none', font: TITLE_FONT }} layout={{ padding: 0 }}>
      visible bounds
    </Node>
    <Node position={[202, 66]} style={{ stroke: 'none', textColor: 'gray', font: NOTE_FONT }} layout={{ padding: 0 }}>
      visible / clip
    </Node>
    <Draw
      way={[
        [150, 53],
        [110, 25],
      ]}
      arrow="->"
      style={{ stroke: 'darkorange' }}
    />
  </Layout>
);

export default Demo;
