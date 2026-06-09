import { Circle, Draw, Ellipse, Layout, Node, Rectangle } from '@retikz/react';
import type { FC } from 'react';

const CONTENT_WIDTH = 82;
const CONTENT_HEIGHT = 30;
const INNER_WIDTH = 132;
const INNER_HEIGHT = 74;
const BBOX_WIDTH = INNER_WIDTH * Math.SQRT2;
const BBOX_HEIGHT = INNER_HEIGHT * Math.SQRT2;
const BOUNDARY_RADIUS = Math.max(BBOX_WIDTH, BBOX_HEIGHT) / 2;

const Demo: FC = () => (
  <Layout width={520} height={300} viewBox={{ x: -250, y: -145, width: 500, height: 285 }} style={{ maxWidth: '100%', height: 'auto' }}>
    <Rectangle center={[0, 0]} width={CONTENT_WIDTH} height={CONTENT_HEIGHT} fill="lightgray" stroke="none" />
    <Rectangle center={[0, 0]} width={INNER_WIDTH} height={INNER_HEIGHT} fill="none" stroke="gray" dashPattern={[4, 3]} />
    <Ellipse center={[0, 0]} radiusX={BBOX_WIDTH / 2} radiusY={BBOX_HEIGHT / 2} fill="none" stroke="darkorange" strokeWidth={2} />
    <Rectangle center={[0, 0]} width={BBOX_WIDTH} height={BBOX_HEIGHT} fill="none" stroke="lightgray" dashPattern={[4, 3]} />
    <Circle center={[0, 0]} radius={BOUNDARY_RADIUS} fill="none" stroke="dodgerblue" dashPattern={[4, 3]} />

    <Node id="content" position={[0, 0]} stroke="none" padding={0}>
      内容
    </Node>

    <Node id="anchor-n" position={[0, -BOUNDARY_RADIUS]} shape="circle" minimumSize={8} fill="darkorange" stroke="none" />
    <Node id="anchor-e" position={[BOUNDARY_RADIUS, 0]} shape="circle" minimumSize={8} fill="darkorange" stroke="none" />
    <Node id="anchor-s" position={[0, BOUNDARY_RADIUS]} shape="circle" minimumSize={8} fill="darkorange" stroke="none" />
    <Node id="anchor-w" position={[-BOUNDARY_RADIUS, 0]} shape="circle" minimumSize={8} fill="darkorange" stroke="none" />

    <Node id="content-label" position={[-178, -58]} stroke="none" textColor="gray">
      内容盒
    </Node>
    <Node id="padding-label" position={[-178, -18]} stroke="none" textColor="gray">
      padding
    </Node>
    <Node id="shape-label" position={[178, -54]} stroke="none" textColor="darkorange">
      shape
    </Node>
    <Node id="bbox-label" position={[178, 2]} stroke="none" textColor="gray">
      外接框
    </Node>
    <Node id="boundary-label" position={[178, 58]} stroke="none" textColor="dodgerblue">
      boundary
    </Node>
    <Node id="anchor-label" position={[0, 126]} stroke="none" textColor="darkorange">
      anchors
    </Node>

    <Draw way={['content-label', 'content']} stroke="gray" arrow="->" />
    <Draw way={['padding-label', [-INNER_WIDTH / 2, -INNER_HEIGHT / 2]]} stroke="gray" arrow="->" />
    <Draw way={['shape-label', [BBOX_WIDTH / 2, 0]]} stroke="darkorange" arrow="->" />
    <Draw way={['bbox-label', [BBOX_WIDTH / 2, BBOX_HEIGHT / 2]]} stroke="gray" arrow="->" />
    <Draw way={['boundary-label', [BOUNDARY_RADIUS * 0.68, BOUNDARY_RADIUS * 0.73]]} stroke="dodgerblue" arrow="->" />
    <Draw way={['anchor-label', 'anchor-s']} stroke="darkorange" arrow="->" />
  </Layout>
);

export default Demo;
