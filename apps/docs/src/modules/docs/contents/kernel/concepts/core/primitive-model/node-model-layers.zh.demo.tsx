import type { FC } from 'react';

import { Circle, Draw, Ellipse, Layout, Node, Rectangle } from '@retikz/react';

const CONTENT_WIDTH = 82;
const CONTENT_HEIGHT = 30;
const INNER_WIDTH = 132;
const INNER_HEIGHT = 74;
const BBOX_WIDTH = INNER_WIDTH * Math.SQRT2;
const BBOX_HEIGHT = INNER_HEIGHT * Math.SQRT2;
const BOUNDARY_RADIUS = Math.max(BBOX_WIDTH, BBOX_HEIGHT) / 2;
const SHAPE_TARGET_ANGLE = (-50 * Math.PI) / 180;
const SHAPE_TARGET: [number, number] = [
  (BBOX_WIDTH / 2) * Math.cos(SHAPE_TARGET_ANGLE),
  (BBOX_HEIGHT / 2) * Math.sin(SHAPE_TARGET_ANGLE),
];

const Demo: FC = () => (
  <Layout
    width={520}
    height={300}
    viewBox={{ x: -250, y: -145, width: 500, height: 285 }}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <Rectangle
      center={[0, 0]}
      width={CONTENT_WIDTH}
      height={CONTENT_HEIGHT}
      style={{ fill: 'lightgray', stroke: 'none' }}
    />
    <Rectangle
      center={[0, 0]}
      width={INNER_WIDTH}
      height={INNER_HEIGHT}
      style={{ fill: 'none', stroke: 'currentColor', dashPattern: [4, 3] }}
    />
    <Ellipse
      center={[0, 0]}
      radius={{ x: BBOX_WIDTH / 2, y: BBOX_HEIGHT / 2 }}
      style={{ fill: 'none', stroke: 'darkorange', strokeWidth: 2 }}
    />
    <Rectangle
      center={[0, 0]}
      width={BBOX_WIDTH}
      height={BBOX_HEIGHT}
      style={{ fill: 'none', stroke: 'gray', dashPattern: [4, 3] }}
    />
    <Circle
      center={[0, 0]}
      radius={BOUNDARY_RADIUS}
      style={{ fill: 'none', stroke: 'dodgerblue', dashPattern: [4, 3] }}
    />

    <Node id="content" position={[0, 0]} style={{ stroke: 'none' }} layout={{ padding: 0 }}>
      内容
    </Node>

    <Node
      id="anchor-n"
      position={[0, -BOUNDARY_RADIUS]}
      shape="circle"
      style={{ fill: 'dodgerblue', stroke: 'none' }}
      layout={{ padding: 0, minimumSize: 4 }}
    />
    <Node
      id="anchor-e"
      position={[BOUNDARY_RADIUS, 0]}
      shape="circle"
      style={{ fill: 'dodgerblue', stroke: 'none' }}
      layout={{ padding: 0, minimumSize: 4 }}
    />
    <Node
      id="anchor-s"
      position={[0, BOUNDARY_RADIUS]}
      shape="circle"
      style={{ fill: 'dodgerblue', stroke: 'none' }}
      layout={{ padding: 0, minimumSize: 4 }}
    />
    <Node
      id="anchor-w"
      position={[-BOUNDARY_RADIUS, 0]}
      shape="circle"
      style={{ fill: 'dodgerblue', stroke: 'none' }}
      layout={{ padding: 0, minimumSize: 4 }}
    />

    <Node id="padding-label" position={[-178, -58]} style={{ stroke: 'none', textColor: 'gray' }}>
      {'内边距\npadding'}
    </Node>
    <Node id="shape-label" position={[178, -58]} style={{ stroke: 'none', textColor: 'darkorange' }}>
      {'形状\nshape'}
    </Node>
    <Node id="content-label" position={[-178, 0]} style={{ stroke: 'none', textColor: 'gray' }}>
      {'内容盒\ncontent box'}
    </Node>
    <Node id="anchor-label" position={[178, 0]} style={{ stroke: 'none', textColor: 'dodgerblue' }}>
      {'锚点\nanchors'}
    </Node>
    <Node id="bbox-label" position={[-178, 58]} style={{ stroke: 'none', textColor: 'gray' }}>
      {'外接框\nbounding box'}
    </Node>
    <Node id="boundary-label" position={[178, 58]} style={{ stroke: 'none', textColor: 'dodgerblue' }}>
      {'连接面\nboundary'}
    </Node>

    <Draw way={['content-label', 'content']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['padding-label', [-INNER_WIDTH / 2, -INNER_HEIGHT / 2]]} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['shape-label', SHAPE_TARGET]} arrow="->" style={{ stroke: 'darkorange' }} />
    <Draw way={['bbox-label', [-BBOX_WIDTH / 2, BBOX_HEIGHT / 2]]} arrow="->" style={{ stroke: 'gray' }} />
    <Draw
      way={['boundary-label', [BOUNDARY_RADIUS * 0.68, BOUNDARY_RADIUS * 0.73]]}
      arrow="->"
      style={{ stroke: 'dodgerblue' }}
    />
    <Draw way={['anchor-label', 'anchor-e']} arrow="->" style={{ stroke: 'dodgerblue' }} />
  </Layout>
);

export default Demo;
