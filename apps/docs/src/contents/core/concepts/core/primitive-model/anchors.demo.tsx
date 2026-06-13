import { Circle, Draw, DrawWay, Layout, Node, Rectangle } from '@retikz/react';
import type { FC } from 'react';

const FONT = { size: 10 };
const RECT = { fill: 'none', stroke: 'darkorange', strokeWidth: 2 } as const;
const TITLE = { stroke: 'none', textColor: 'gray' } as const;
// 点用蓝色（anchor 本身），标注文字统一灰色
const TAG = { stroke: 'none', textColor: 'gray' } as const;
const DEG = Math.PI / 180;

const polar = (cx: number, cy: number, r: number, deg: number): [number, number] => [cx + r * Math.cos(deg * DEG), cy + r * Math.sin(deg * DEG)];
const arcPts = (cx: number, cy: number, r: number, a: number, b: number, n: number): Array<[number, number]> =>
  Array.from({ length: n + 1 }, (_unused, i): [number, number] => polar(cx, cy, r, a + ((b - a) * i) / n));

// 第一排两个矩形：左 = 8 方位 anchor，右 = 角度 / 边比例 anchor
const RA = { x: -120, y: -58, w: 42, h: 26 };
const RB = { x: 120, y: -58, w: 42, h: 26 };

const COMPASS: Array<{ dx: number; dy: number; l: string }> = [
  { dx: 0, dy: -1, l: 'N' },
  { dx: 1, dy: -1, l: 'NE' },
  { dx: 1, dy: 0, l: 'E' },
  { dx: 1, dy: 1, l: 'SE' },
  { dx: 0, dy: 1, l: 'S' },
  { dx: -1, dy: 1, l: 'SW' },
  { dx: -1, dy: 0, l: 'W' },
  { dx: -1, dy: -1, l: 'NW' },
];

// 角度 anchor 30°：从中心沿 30° 射线打到边界（命中 east 边）
const ANG_PT: [number, number] = [RB.x + RB.w, RB.y + RB.w * Math.tan(30 * DEG)];
// 边比例 anchor {side:'north', t:0.25}：north 边西→东，t=0 在 NW
const EDGE_PT: [number, number] = [RB.x - RB.w + 0.25 * 2 * RB.w, RB.y - RB.h];

// 第二排：有 shape 专属 anchor 的非矩形 —— star / sector / arc
const STAR_C = { x: -130, y: 88, ro: 34, ri: 14 };
const STAR: Array<[number, number]> = Array.from({ length: 10 }, (_unused, j): [number, number] => polar(STAR_C.x, STAR_C.y, j % 2 === 0 ? STAR_C.ro : STAR_C.ri, -90 + j * 36));
const TIPS = [0, 2, 4, 6, 8].map(j => STAR[j]);

const SEC = { x: 0, y: 110, ro: 44, ri: 0, a: -150, b: -30 };
const SECTOR_TIPS: Array<[number, number]> = [
  [SEC.x, SEC.y], // apex
  polar(SEC.x, SEC.y, SEC.ro, (SEC.a + SEC.b) / 2), // outer-arc-mid
  polar(SEC.x, SEC.y, (SEC.ri + SEC.ro) / 2, SEC.a), // start-edge-mid
  polar(SEC.x, SEC.y, (SEC.ri + SEC.ro) / 2, SEC.b), // end-edge-mid
];

const ARC = { x: 150, y: 104, r: 36, a: -150, b: -30 };
const ARC_TIPS: Array<[number, number]> = [
  polar(ARC.x, ARC.y, ARC.r, ARC.a), // start
  polar(ARC.x, ARC.y, ARC.r, (ARC.a + ARC.b) / 2), // arc-mid
  polar(ARC.x, ARC.y, ARC.r, ARC.b), // end
];

const Demo: FC = () => (
  <Layout width={520} height={333} viewBox={{ x: -200, y: -106, width: 400, height: 256 }} style={{ maxWidth: '100%', height: 'auto' }}>
    {/* 第一排 · 左：8 方位 anchor */}
    <Rectangle center={[RA.x, RA.y]} width={RA.w * 2} height={RA.h * 2} {...RECT} />
    <Circle center={[RA.x, RA.y]} radius={3} fill="dodgerblue" stroke="none" />
    {COMPASS.map(({ dx, dy, l }) => (
      <Circle key={`a-${l}`} center={[RA.x + dx * RA.w, RA.y + dy * RA.h]} radius={3} fill="dodgerblue" stroke="none" />
    ))}
    {COMPASS.map(({ dx, dy, l }) => (
      <Node key={`al-${l}`} id={`al-${l}`} position={[RA.x + dx * (RA.w + 15), RA.y + dy * (RA.h + 12)]} {...TAG} font={FONT}>
        {l}
      </Node>
    ))}
    <Node id="ta" position={[RA.x, 8]} {...TITLE} font={FONT}>
      compass + center
    </Node>

    {/* 第一排 · 右：角度 / 边比例 anchor */}
    <Rectangle center={[RB.x, RB.y]} width={RB.w * 2} height={RB.h * 2} {...RECT} />
    <Circle center={[RB.x, RB.y]} radius={3} fill="dodgerblue" stroke="none" />
    <Draw way={[[RB.x, RB.y], ANG_PT]} stroke="dodgerblue" />
    <Circle center={ANG_PT} radius={3} fill="dodgerblue" stroke="none" />
    <Node id="bl-ang" position={[ANG_PT[0] + 14, ANG_PT[1] + 4]} {...TAG} font={FONT}>
      {'30°'}
    </Node>
    <Circle center={EDGE_PT} radius={3} fill="dodgerblue" stroke="none" />
    <Node id="bl-edge" position={[EDGE_PT[0], EDGE_PT[1] - 12]} {...TAG} font={FONT}>
      edge t=0.25
    </Node>
    <Node id="tb" position={[RB.x, 8]} {...TITLE} font={FONT}>
      angle / edge
    </Node>

    {/* 第二排 · star：tip-N 尖角 */}
    <Draw way={[...STAR, DrawWay.Cycle]} {...RECT} />
    {TIPS.map(([x, y], i) => (
      <Circle key={`tip-${i}`} center={[x, y]} radius={3} fill="dodgerblue" stroke="none" />
    ))}
    <Node id="ts" position={[STAR_C.x, 140]} {...TITLE} font={FONT}>
      star · tip-N
    </Node>

    {/* 第二排 · sector：apex 与外弧端点 */}
    <Draw way={[[SEC.x, SEC.y], ...arcPts(SEC.x, SEC.y, SEC.ro, SEC.a, SEC.b, 14), DrawWay.Cycle]} {...RECT} />
    {SECTOR_TIPS.map(([x, y], i) => (
      <Circle key={`sec-${i}`} center={[x, y]} radius={3} fill="dodgerblue" stroke="none" />
    ))}
    <Node id="tsec" position={[SEC.x, 140]} {...TITLE} font={FONT}>
      sector · apex / arc-mid / edge-mid
    </Node>

    {/* 第二排 · arc：start / arc-mid / end */}
    <Draw way={arcPts(ARC.x, ARC.y, ARC.r, ARC.a, ARC.b, 14)} {...RECT} />
    {ARC_TIPS.map(([x, y], i) => (
      <Circle key={`arc-${i}`} center={[x, y]} radius={3} fill="dodgerblue" stroke="none" />
    ))}
    <Node id="tarc" position={[ARC.x, 140]} {...TITLE} font={FONT}>
      arc · start / mid / end
    </Node>
  </Layout>
);

export default Demo;
