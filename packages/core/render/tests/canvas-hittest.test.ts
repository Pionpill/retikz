import { describe, expect, it } from 'vitest';
import type { Scene } from '@retikz/core';
import { hitTest } from '../src/canvas';

/**
 * ADR-01 水合：Canvas hitTest（逆 z-order + fill/stroke 区分 + group 祖先 id）
 * @description hitTest 无逐图元 DOM，靠把每个图元几何重建进一个 2D context 后调 isPointInPath /
 *   isPointInStroke 点测。本测试注入一个「几何忠实」的 2D context 充当原生 canvas：记录子路径并按
 *   even-odd / nonzero 射线法回答 isPointInPath、按点到线段距离回答 isPointInStroke——只提供 canvas 原语，
 *   hitTest 自身的「选哪个图元 / z-order / 祖先 id / 容差」逻辑仍真实受测。
 *   stub 阶段 hitTest 恒返回 null，断言此刻预期 fail。
 */

type Pt = [number, number];

type SubPath = {
  points: Array<Pt>;
  closed: boolean;
};

/**
 * 几何忠实的 2D context test harness：足够支撑 hitTest 的路径构建 + 点测
 * @description 记录 moveTo/lineTo/rect/arc/ellipse/bezierCurveTo/quadraticCurveTo 为折线子路径；
 *   transform（translate/rotate/scale/setTransform）按仿射矩阵应用到落点；isPointInPath 用射线法、
 *   isPointInStroke 用点到线段距离（含 lineWidth/2）。曲线 / 弧采样成折线（命中判定够用）。
 */
const createGeometryContext = (): CanvasRenderingContext2D => {
  let subPaths: Array<SubPath> = [];
  let current: SubPath | null = null;
  let cursor: Pt = [0, 0];
  // 仿射矩阵 [a, b, c, d, e, f]：x' = a*x + c*y + e，y' = b*x + d*y + f
  let matrix: [number, number, number, number, number, number] = [1, 0, 0, 1, 0, 0];
  const stack: Array<[number, number, number, number, number, number]> = [];
  let lineWidth = 1;

  const apply = (x: number, y: number): Pt => {
    const [a, b, c, d, e, f] = matrix;
    return [a * x + c * y + e, b * x + d * y + f];
  };
  const multiply = (m: [number, number, number, number, number, number]): void => {
    const [a, b, c, d, e, f] = matrix;
    const [a2, b2, c2, d2, e2, f2] = m;
    matrix = [
      a * a2 + c * b2,
      b * a2 + d * b2,
      a * c2 + c * d2,
      b * c2 + d * d2,
      a * e2 + c * f2 + e,
      b * e2 + d * f2 + f,
    ];
  };
  const ensure = (): SubPath => {
    if (current === null) {
      current = { points: [cursor], closed: false };
      subPaths.push(current);
    }
    return current;
  };

  const ctx = {
    get lineWidth() {
      return lineWidth;
    },
    set lineWidth(v: number) {
      lineWidth = v;
    },
    beginPath(): void {
      subPaths = [];
      current = null;
    },
    closePath(): void {
      if (current) current.closed = true;
    },
    moveTo(x: number, y: number): void {
      cursor = apply(x, y);
      current = { points: [cursor], closed: false };
      subPaths.push(current);
    },
    lineTo(x: number, y: number): void {
      cursor = apply(x, y);
      ensure().points.push(cursor);
    },
    rect(x: number, y: number, w: number, h: number): void {
      const p: SubPath = {
        points: [apply(x, y), apply(x + w, y), apply(x + w, y + h), apply(x, y + h)],
        closed: true,
      };
      subPaths.push(p);
      current = null;
    },
    quadraticCurveTo(cx: number, cy: number, x: number, y: number): void {
      const sp = ensure();
      const from = cursor;
      const ctrl = apply(cx, cy);
      const to = apply(x, y);
      for (let i = 1; i <= 8; i++) {
        const t = i / 8;
        const mt = 1 - t;
        sp.points.push([
          mt * mt * from[0] + 2 * mt * t * ctrl[0] + t * t * to[0],
          mt * mt * from[1] + 2 * mt * t * ctrl[1] + t * t * to[1],
        ]);
      }
      cursor = to;
    },
    bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void {
      const sp = ensure();
      const from = cursor;
      const c1 = apply(c1x, c1y);
      const c2 = apply(c2x, c2y);
      const to = apply(x, y);
      for (let i = 1; i <= 12; i++) {
        const t = i / 12;
        const mt = 1 - t;
        sp.points.push([
          mt * mt * mt * from[0] + 3 * mt * mt * t * c1[0] + 3 * mt * t * t * c2[0] + t * t * t * to[0],
          mt * mt * mt * from[1] + 3 * mt * mt * t * c1[1] + 3 * mt * t * t * c2[1] + t * t * t * to[1],
        ]);
      }
      cursor = to;
    },
    arc(cx: number, cy: number, r: number, start: number, end: number): void {
      const sp = ensure();
      const steps = 24;
      for (let i = 0; i <= steps; i++) {
        const ang = start + ((end - start) * i) / steps;
        sp.points.push(apply(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r));
      }
      sp.closed = true;
    },
    ellipse(cx: number, cy: number, rx: number, ry: number, rot: number, start: number, end: number): void {
      const sp = ensure();
      const steps = 24;
      for (let i = 0; i <= steps; i++) {
        const ang = start + ((end - start) * i) / steps;
        const ex = Math.cos(ang) * rx;
        const ey = Math.sin(ang) * ry;
        const rx2 = ex * Math.cos(rot) - ey * Math.sin(rot);
        const ry2 = ex * Math.sin(rot) + ey * Math.cos(rot);
        sp.points.push(apply(cx + rx2, cy + ry2));
      }
      sp.closed = true;
    },
    save(): void {
      stack.push([...matrix]);
    },
    restore(): void {
      const m = stack.pop();
      if (m) matrix = m;
    },
    translate(x: number, y: number): void {
      multiply([1, 0, 0, 1, x, y]);
    },
    rotate(a: number): void {
      multiply([Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]);
    },
    scale(x: number, y: number): void {
      multiply([x, 0, 0, y, 0, 0]);
    },
    setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
      matrix = [a, b, c, d, e, f];
    },
    setLineDash(): void {},
    clip(): void {},
    fill(): void {},
    stroke(): void {},
    isPointInPath(px: number, py: number): boolean {
      // 射线法（even-odd）对所有闭合子路径求并集
      let inside = false;
      for (const sp of subPaths) {
        const pts = sp.points;
        if (pts.length < 3) continue;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const xi = pts[i][0];
          const yi = pts[i][1];
          const xj = pts[j][0];
          const yj = pts[j][1];
          const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
          if (intersect) inside = !inside;
        }
      }
      return inside;
    },
    isPointInStroke(px: number, py: number): boolean {
      const half = lineWidth / 2;
      for (const sp of subPaths) {
        const pts = sp.points;
        const limit = sp.closed ? pts.length : pts.length - 1;
        for (let i = 0; i < limit; i++) {
          const a = pts[i];
          const b = pts[(i + 1) % pts.length];
          const dx = b[0] - a[0];
          const dy = b[1] - a[1];
          const len2 = dx * dx + dy * dy;
          const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / len2));
          const cx = a[0] + t * dx;
          const cy = a[1] + t * dy;
          const dist = Math.hypot(px - cx, py - cy);
          if (dist <= half) return true;
        }
      }
      return false;
    },
  };
  return ctx as unknown as CanvasRenderingContext2D;
};

const ctx = (): CanvasRenderingContext2D => createGeometryContext();

describe('Canvas hitTest', () => {
  it('hit-top-of-overlap：两个重叠 rect，点落重叠区 → 返回上层（逆 z-order）id', () => {
    const scene: Scene = {
      layout: { x: 0, y: 0, width: 100, height: 100 },
      primitives: [
        { type: 'rect', id: 'lower', x: 0, y: 0, width: 50, height: 50, fill: '#f00' },
        { type: 'rect', id: 'upper', x: 25, y: 25, width: 50, height: 50, fill: '#00f' },
      ],
    };
    expect(hitTest(scene, { x: 30, y: 30 }, { context2d: ctx() })).toBe('upper');
  });

  it('hit-only-lower-area：点落仅下层覆盖区 → 返回下层 id', () => {
    const scene: Scene = {
      layout: { x: 0, y: 0, width: 100, height: 100 },
      primitives: [
        { type: 'rect', id: 'lower', x: 0, y: 0, width: 50, height: 50, fill: '#f00' },
        { type: 'rect', id: 'upper', x: 25, y: 25, width: 50, height: 50, fill: '#00f' },
      ],
    };
    expect(hitTest(scene, { x: 5, y: 5 }, { context2d: ctx() })).toBe('lower');
  });

  it('fill-none-stroke-only：fill=none 的 path，填充区内不命中、描边线命中（含 tolerance）', () => {
    const scene: Scene = {
      layout: { x: 0, y: 0, width: 100, height: 100 },
      primitives: [
        {
          type: 'path',
          id: 'ring',
          commands: [
            { kind: 'move', to: [20, 20] },
            { kind: 'line', to: [80, 20] },
            { kind: 'line', to: [80, 80] },
            { kind: 'line', to: [20, 80] },
            { kind: 'close' },
          ],
          fill: 'none',
          stroke: '#000',
          strokeWidth: 4,
        },
      ],
    };
    // 中心落在「填充区」但 fill=none → 不命中
    expect(hitTest(scene, { x: 50, y: 50 }, { context2d: ctx() })).toBeNull();
    // 落在上边描边线上（含 strokeWidth/2 容差）→ 命中
    expect(hitTest(scene, { x: 50, y: 20 }, { context2d: ctx() })).toBe('ring');
  });

  it('stroke-tolerance-option：strokeTolerance 加宽命中带，临界点命中', () => {
    const scene: Scene = {
      layout: { x: 0, y: 0, width: 100, height: 100 },
      primitives: [
        {
          type: 'path',
          id: 'line',
          commands: [
            { kind: 'move', to: [10, 50] },
            { kind: 'line', to: [90, 50] },
          ],
          fill: 'none',
          stroke: '#000',
          strokeWidth: 2,
        },
      ],
    };
    // 距线 4 units：默认 strokeWidth/2=1 容差不命中，给足 tolerance 后命中
    expect(hitTest(scene, { x: 50, y: 54 }, { context2d: ctx() })).toBeNull();
    expect(hitTest(scene, { x: 50, y: 54 }, { context2d: ctx(), strokeTolerance: 5 })).toBe('line');
  });

  it('nested-group-id：命中 GroupPrim 子图元 → 返回最近 id-bearing 祖先（group）id', () => {
    const scene: Scene = {
      layout: { x: 0, y: 0, width: 100, height: 100 },
      primitives: [
        {
          type: 'group',
          id: 'scope1',
          transforms: [{ kind: 'translate', x: 10, y: 10 }],
          children: [{ type: 'rect', x: 0, y: 0, width: 30, height: 30, fill: '#0f0' }],
        },
      ],
    };
    // group translate(10,10) → 子 rect 在 [10,10]~[40,40]；点 (20,20) 命中子 rect → 归到 group id
    expect(hitTest(scene, { x: 20, y: 20 }, { context2d: ctx() })).toBe('scope1');
  });

  it('miss-returns-null：点落空白处 → null', () => {
    const scene: Scene = {
      layout: { x: 0, y: 0, width: 100, height: 100 },
      primitives: [{ type: 'rect', id: 'a', x: 0, y: 0, width: 20, height: 20, fill: '#f00' }],
    };
    expect(hitTest(scene, { x: 90, y: 90 }, { context2d: ctx() })).toBeNull();
  });

  it('hit-on-unidentified-prim-returns-null：命中无 id 且无 id-bearing 祖先的图元 → null', () => {
    const scene: Scene = {
      layout: { x: 0, y: 0, width: 100, height: 100 },
      primitives: [{ type: 'rect', x: 0, y: 0, width: 20, height: 20, fill: '#f00' }],
    };
    expect(hitTest(scene, { x: 10, y: 10 }, { context2d: ctx() })).toBeNull();
  });
});
