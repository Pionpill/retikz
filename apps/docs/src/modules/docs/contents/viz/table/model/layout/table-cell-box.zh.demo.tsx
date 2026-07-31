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

/** 单元格外框、内容区、内容占位与最终可见范围的几何关系 */
const Demo: FC = () => (
  <Layout
    width={540}
    height={200}
    viewBox={{ x: -270, y: -100, width: 540, height: 200 }}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    {/* 两横两竖只补足中央单元格的表格上下文 */}
    <Draw
      way={[
        [-BOX_HALF_WIDTH, -80],
        [-BOX_HALF_WIDTH, 80],
      ]}
      stroke="currentColor"
    />
    <Draw
      way={[
        [BOX_HALF_WIDTH, -80],
        [BOX_HALF_WIDTH, 80],
      ]}
      stroke="currentColor"
    />
    <Draw
      way={[
        [-140, -BOX_HALF_HEIGHT],
        [140, -BOX_HALF_HEIGHT],
      ]}
      stroke="currentColor"
    />
    <Draw
      way={[
        [-140, BOX_HALF_HEIGHT],
        [140, BOX_HALF_HEIGHT],
      ]}
      stroke="currentColor"
    />

    {/* contentBox：box 扣除 padding 后的内容区域 */}
    <Rectangle
      center={[0, 0]}
      width={CONTENT_WIDTH}
      height={CONTENT_HEIGHT}
      fill="none"
      stroke="gray"
      dashPattern={[4, 3]}
    />

    {/* visualOverflowBounds：应用 visible 或 clip 后的可见范围 */}
    <Rectangle
      center={[25, 0]}
      width={VISUAL_WIDTH}
      height={VISUAL_HEIGHT}
      fill="none"
      stroke="darkorange"
      dashPattern={[4, 3]}
    />

    {/* contentAllocationBounds：fit 与 alignment 后的内容占位 */}
    <Rectangle
      center={[12, 0]}
      width={ALLOCATION_WIDTH}
      height={ALLOCATION_HEIGHT}
      fill="dodgerblue"
      fillOpacity={0.08}
      stroke="dodgerblue"
    />
    <Node position={[12, 0]} stroke="none" padding={0} font={NOTE_FONT}>
      child
    </Node>

    <Node position={[-202, -66]} stroke="none" padding={0} font={TITLE_FONT}>
      box
    </Node>
    <Node position={[-202, -46]} stroke="none" padding={0} textColor="gray" font={NOTE_FONT}>
      轨道 + gap + span
    </Node>
    <Draw
      way={[
        [-150, -53],
        [-100, -40],
      ]}
      stroke="currentColor"
      arrow="->"
    />

    <Node position={[-202, 46]} stroke="none" padding={0} font={TITLE_FONT}>
      contentBox
    </Node>
    <Node position={[-202, 66]} stroke="none" padding={0} textColor="gray" font={NOTE_FONT}>
      box − padding
    </Node>
    <Draw
      way={[
        [-148, 53],
        [-75, 29],
      ]}
      stroke="gray"
      arrow="->"
    />

    <Node position={[202, -66]} stroke="none" padding={0} font={TITLE_FONT}>
      content allocation
    </Node>
    <Node position={[202, -46]} stroke="none" padding={0} textColor="gray" font={NOTE_FONT}>
      fit → alignment
    </Node>
    <Draw
      way={[
        [150, -53],
        [57, -17],
      ]}
      stroke="dodgerblue"
      arrow="->"
    />

    <Node position={[202, 46]} stroke="none" padding={0} font={TITLE_FONT}>
      visible bounds
    </Node>
    <Node position={[202, 66]} stroke="none" padding={0} textColor="gray" font={NOTE_FONT}>
      visible / clip
    </Node>
    <Draw
      way={[
        [150, 53],
        [110, 25],
      ]}
      stroke="darkorange"
      arrow="->"
    />
  </Layout>
);

export default Demo;
