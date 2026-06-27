import { Draw, Layout, Node, Rectangle } from '@retikz/react';
import type { FC } from 'react';

const CONTENT_WIDTH = 86;
const CONTENT_HEIGHT = 34;
const INNER_SEP = 24;
const OUTER_SEP = 20;
const INNER_WIDTH = CONTENT_WIDTH + INNER_SEP * 2;
const INNER_HEIGHT = CONTENT_HEIGHT + INNER_SEP * 2;
const OUTER_WIDTH = INNER_WIDTH + OUTER_SEP * 2;
const OUTER_HEIGHT = INNER_HEIGHT + OUTER_SEP * 2;
const FONT = { size: 10 }; // match the Model Anatomy figure's visual font size (smaller viewBox)

const Demo: FC = () => (
  <Layout width={480} height={272} viewBox={{ x: -185, y: -105, width: 370, height: 210 }} style={{ maxWidth: '100%', height: 'auto' }}>
    {/* Outer frame: inner frame + outerSep (margin), where automatic path endpoints land */}
    <Rectangle center={[0, 0]} width={OUTER_WIDTH} height={OUTER_HEIGHT} fill="none" stroke="gray" dashPattern={[4, 3]} />
    {/* Inner frame: content box + innerSep, the rectangular node's shape */}
    <Rectangle center={[0, 0]} width={INNER_WIDTH} height={INNER_HEIGHT} fill="none" stroke="currentColor" dashPattern={[4, 3]} />
    {/* Content box: base size from text measurement */}
    <Rectangle center={[0, 0]} width={CONTENT_WIDTH} height={CONTENT_HEIGHT} fill="lightgray" stroke="none" />

    <Node id="content" position={[0, 0]} stroke="none" padding={0} font={FONT}>
      content
    </Node>

    {/* Outer frame: centered label above, one vertical arrow to the top edge, gray */}
    <Node id="outer-label" position={[0, -85]} stroke="none" textColor="gray" font={FONT}>
      outer frame
    </Node>
    <Draw way={['outer-label', [0, -OUTER_HEIGHT / 2]]} stroke="gray" arrow="->" />

    {/* Inner frame: centered label below, one vertical arrow to the bottom edge, currentColor */}
    <Node id="inner-label" position={[0, 85]} stroke="none" font={FONT}>
      inner frame
    </Node>
    <Draw way={['inner-label', [0, INNER_HEIGHT / 2]]} stroke="currentColor" arrow="->" />

    {/* Content box: left label, currentColor */}
    <Node id="content-label" position={[-145, 0]} stroke="none" font={FONT}>
      content box
    </Node>
    <Draw way={['content-label', [-CONTENT_WIDTH / 2, 0]]} stroke="currentColor" arrow="->" />

    {/* innerSep (= padding): right label pointing to the padding gap, currentColor */}
    <Node id="inner-sep-label" position={[150, -20]} stroke="none" font={FONT}>
      {'innerSep\n= padding'}
    </Node>
    <Draw way={['inner-sep-label', [CONTENT_WIDTH / 2 + INNER_SEP / 2, -20]]} stroke="currentColor" arrow="->" />

    {/* outerSep (= margin): right label pointing to the margin gap, gray */}
    <Node id="outer-sep-label" position={[150, 20]} stroke="none" textColor="gray" font={FONT}>
      {'outerSep\n= margin'}
    </Node>
    <Draw way={['outer-sep-label', [INNER_WIDTH / 2 + OUTER_SEP / 2, 20]]} stroke="gray" arrow="->" />
  </Layout>
);

export default Demo;
