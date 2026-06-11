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
const FONT = { size: 10 }; // 与「模型解剖」图字号视觉一致（viewBox 更小，故缩小字号）

const Demo: FC = () => (
  <Layout width={480} height={272} viewBox={{ x: -185, y: -105, width: 370, height: 210 }} style={{ maxWidth: '100%', height: 'auto' }}>
    {/* 外框：内框 + outerSep（margin），自动连线端点的边界 */}
    <Rectangle center={[0, 0]} width={OUTER_WIDTH} height={OUTER_HEIGHT} fill="none" stroke="gray" dashPattern={[4, 3]} />
    {/* 内框：内容盒 + innerSep，矩形节点的 shape */}
    <Rectangle center={[0, 0]} width={INNER_WIDTH} height={INNER_HEIGHT} fill="none" stroke="currentColor" dashPattern={[4, 3]} />
    {/* 内容盒：文本测量出的基础尺寸 */}
    <Rectangle center={[0, 0]} width={CONTENT_WIDTH} height={CONTENT_HEIGHT} fill="lightgray" stroke="none" />

    <Node id="content" position={[0, 0]} stroke="none" padding={0} font={FONT}>
      内容
    </Node>

    {/* 外框：标签居中放上方，一条垂直箭头指向上边，gray */}
    <Node id="outer-label" position={[0, -85]} stroke="none" textColor="gray" font={FONT}>
      {'外框\nouter frame'}
    </Node>
    <Draw way={['outer-label', [0, -OUTER_HEIGHT / 2]]} stroke="gray" arrow="->" />

    {/* 内框：标签居中放下方，一条垂直箭头指向下边，currentColor */}
    <Node id="inner-label" position={[0, 85]} stroke="none" font={FONT}>
      {'内框\ninner frame'}
    </Node>
    <Draw way={['inner-label', [0, INNER_HEIGHT / 2]]} stroke="currentColor" arrow="->" />

    {/* 内容盒：左侧标签，currentColor */}
    <Node id="content-label" position={[-145, 0]} stroke="none" font={FONT}>
      {'内容盒\ncontent box'}
    </Node>
    <Draw way={['content-label', [-CONTENT_WIDTH / 2, 0]]} stroke="currentColor" arrow="->" />

    {/* innerSep（= padding）：右侧标签指向内边距间隙，currentColor */}
    <Node id="inner-sep-label" position={[150, -20]} stroke="none" font={FONT}>
      {'innerSep\n= padding'}
    </Node>
    <Draw way={['inner-sep-label', [CONTENT_WIDTH / 2 + INNER_SEP / 2, -20]]} stroke="currentColor" arrow="->" />

    {/* outerSep（= margin）：右侧标签指向外边距间隙，gray */}
    <Node id="outer-sep-label" position={[150, 20]} stroke="none" textColor="gray" font={FONT}>
      {'outerSep\n= margin'}
    </Node>
    <Draw way={['outer-sep-label', [INNER_WIDTH / 2 + OUTER_SEP / 2, 20]]} stroke="gray" arrow="->" />
  </Layout>
);

export default Demo;
