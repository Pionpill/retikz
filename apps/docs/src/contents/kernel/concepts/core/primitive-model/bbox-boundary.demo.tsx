import { Circle, Draw, Layout, Node, Rectangle } from '@retikz/react';
import type { FC } from 'react';

const LX = -135;
const RX = 135;
const IFW = 78; // 内框宽（共享）
const IFH = 52; // 内框高
const BBW = 108; // 外接框宽 = 六边形 AABB
const BBH = 93.53; // 外接框高
const R = 54; // boundary="circle" 半径 = 外接框较长半轴（= 六边形外接圆）

// 正六边形顶点（绕原点），circumscribe 共享内框；左右顶点贴外接框左右、横边贴外接框上下
const HEX: Array<[number, number]> = [
  [54, 0], [27, 46.77], [-27, 46.77], [-54, 0], [-27, -46.77], [27, -46.77], [54, 0],
];
const shift = (cx: number, pts: Array<[number, number]>): Array<[number, number]> =>
  pts.map(([x, y]): [number, number] => [cx + x, y]);

const Demo: FC = () => (
  <Layout width={600} height={207} viewBox={{ x: -232, y: -64, width: 464, height: 160 }} style={{ maxWidth: '100%', height: 'auto' }}>
    {/* 左：boundary = shape（默认），自动连线贴到多边形边缘 */}
    <Rectangle center={[LX, 0]} width={BBW} height={BBH} fill="none" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={shift(LX, HEX)} stroke="darkorange" strokeWidth={2} />
    <Rectangle center={[LX, 0]} width={IFW} height={IFH} fill="none" stroke="currentColor" dashPattern={[4, 3]} />
    <Draw way={[[LX - 84, 0], [LX - 54, 0]]} arrow="->" stroke="gray" />
    <Draw way={[[LX - 66.5, -38.4], [LX - 40.5, -23.39]]} arrow="->" stroke="gray" />
    <Draw way={[[LX - 66.5, 38.4], [LX - 40.5, 23.39]]} arrow="->" stroke="gray" />

    {/* 右：boundary = circle，连线改贴到圆；shape / 内框 / 外接框都不变 */}
    <Rectangle center={[RX, 0]} width={BBW} height={BBH} fill="none" stroke="gray" dashPattern={[4, 3]} />
    <Circle center={[RX, 0]} radius={R} fill="none" stroke="dodgerblue" dashPattern={[4, 3]} />
    <Draw way={shift(RX, HEX)} stroke="darkorange" strokeWidth={2} />
    <Rectangle center={[RX, 0]} width={IFW} height={IFH} fill="none" stroke="currentColor" dashPattern={[4, 3]} />
    <Draw way={[[RX + 84, 0], [RX + 54, 0]]} arrow="->" stroke="gray" />
    <Draw way={[[RX + 66.5, -38.4], [RX + 46.77, -27]]} arrow="->" stroke="gray" />
    <Draw way={[[RX + 66.5, 38.4], [RX + 46.77, 27]]} arrow="->" stroke="gray" />

    {/* 中间标注：bounding box / inner frame，各自指向两边 */}
    <Node id="bbox-lbl" position={[0, -20]} stroke="none" textColor="gray" font={{ size: 12 }}>
      bounding box
    </Node>
    <Draw way={['bbox-lbl', [LX + BBW / 2, -20]]} arrow="->" stroke="gray" />
    <Draw way={['bbox-lbl', [RX - BBW / 2, -20]]} arrow="->" stroke="gray" />

    <Node id="if-lbl" position={[0, 20]} stroke="none" font={{ size: 12 }}>
      inner frame
    </Node>
    <Draw way={['if-lbl', [LX + IFW / 2, 20]]} arrow="->" stroke="currentColor" />
    <Draw way={['if-lbl', [RX - IFW / 2, 20]]} arrow="->" stroke="currentColor" />

    {/* 两种 boundary 模式 */}
    <Node id="lbl-shape" position={[LX, 78]} stroke="none" textColor="gray">
      boundary = shape
    </Node>
    <Node id="lbl-circle" position={[RX, 78]} stroke="none" textColor="dodgerblue">
      boundary = circle
    </Node>
  </Layout>
);

export default Demo;
