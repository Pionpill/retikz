import { Draw, Layout, Node } from '@retikz/react';
import type { FC, ReactElement } from 'react';

/**
 * 显式（锁定）anchor：通用方位 anchor 走盒模型；形状专属 anchor 走真实形状
 * @description 三组同款排布：rectangle / ellipse 用通用方位 anchor（默认在外接框矩形上解析——椭圆对角落 bbox 角）；
 *   star 用它专属的 `tip-N`（恒落在真实尖角上，boundary 不影响）。
 */
type Dir = { id: string; pos: [number, number]; label: string; anchor: string };

const COMPASS: Array<Dir> = [
  { id: 'n', pos: [0, -60], label: 'N', anchor: 'north' },
  { id: 's', pos: [0, 60], label: 'S', anchor: 'south' },
  { id: 'e', pos: [72, 0], label: 'E', anchor: 'east' },
  { id: 'w', pos: [-72, 0], label: 'W', anchor: 'west' },
  { id: 'ne', pos: [58, -58], label: 'NE', anchor: 'north-east' },
  { id: 'nw', pos: [-58, -58], label: 'NW', anchor: 'north-west' },
  { id: 'se', pos: [58, 58], label: 'SE', anchor: 'south-east' },
  { id: 'sw', pos: [-58, 58], label: 'SW', anchor: 'south-west' },
];

// 5 个尖角方向（star 默认第一尖角朝上，每 72° 一个）；源放在 tip 外更远处，连线更长
const TIPS: Array<Dir> = [
  { id: 't0', pos: [0, -70], label: '0', anchor: 'tip-0' },
  { id: 't1', pos: [67, -22], label: '1', anchor: 'tip-1' },
  { id: 't2', pos: [41, 57], label: '2', anchor: 'tip-2' },
  { id: 't3', pos: [-41, 57], label: '3', anchor: 'tip-3' },
  { id: 't4', pos: [-67, -22], label: '4', anchor: 'tip-4' },
];

// 一组：方位源 + 锁定到对应 anchor 的 Draw（hub 节点单独写，因为 shape 写法不同）
const ring = (tag: string, cx: number, dirs: Array<Dir>): Array<ReactElement> => [
  ...dirs.map(d => (
    <Node key={`n-${tag}-${d.id}`} id={`${tag}-${d.id}`} position={[cx + d.pos[0], d.pos[1]]} stroke="none">
      {d.label}
    </Node>
  )),
  // 目标用对象形态 { id, anchor }：compass 名与 shape 专属名（tip-N）都走它——
  // 字符串 shorthand `'id.tip-0'` 只认标准方位名，shape 专属 anchor 会被 parser 拒掉。
  ...dirs.map(d => <Draw key={`d-${tag}-${d.id}`} way={[`${tag}-${d.id}`, { id: `${tag}-o`, anchor: d.anchor }]} />),
];

const Demo: FC = () => (
  <Layout width={560} height={270} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="rect-o" position={[-185, 0]} shape="rectangle" padding={12} stroke="gray" dashPattern={[4, 3]}>
      Node
    </Node>
    {ring('rect', -185, COMPASS)}

    <Node id="ell-o" position={[0, 0]} shape="ellipse" padding={12} stroke="gray" dashPattern={[4, 3]}>
      Node
    </Node>
    {ring('ell', 0, COMPASS)}

    <Node id="star-o" position={[185, 0]} shape={{ type: 'star', params: { points: 5, innerRadius: 15, outerRadius: 38 } }} stroke="gray" dashPattern={[4, 3]}>
      Node
    </Node>
    {ring('star', 185, TIPS)}

    <Node position={[-185, 110]} stroke="none" padding={0} textColor="gray">
      rectangle
    </Node>
    <Node position={[0, 110]} stroke="none" padding={0} textColor="gray">
      ellipse
    </Node>
    <Node position={[185, 110]} stroke="none" padding={0} textColor="gray">
      star · tip-N
    </Node>
  </Layout>
);

export default Demo;
