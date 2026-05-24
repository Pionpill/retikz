import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { CompileWarning, IR, ScenePrimitive } from '../../src';
import type { RectPrim } from '../../src/primitive';
import { flattenPrims } from '../helpers/flatten';

/** 取所有 RectPrim（默认 rectangle 节点；带文本节点包 group，flatten 穿透） */
const rects = (prims: Array<ScenePrimitive>): Array<RectPrim> =>
  flattenPrims(prims).filter((p): p is RectPrim => p.type === 'rect');

/** rect 几何中心 [cx, cy] */
const rectCenter = (r: RectPrim): [number, number] => [
  r.x + r.width / 2,
  r.y + r.height / 2,
];

/** 取顶层 path primitive */
const topPath = (prims: ReadonlyArray<ScenePrimitive>): ScenePrimitive | undefined =>
  prims.find(p => p.type === 'path');

/** 取 path 第一条 line 命令的终点 */
const firstLineTo = (prim: ScenePrimitive | undefined): [number, number] | undefined => {
  if (!prim || prim.type !== 'path') return undefined;
  for (const cmd of prim.commands) {
    if (cmd.kind === 'line') return cmd.to;
  }
  return undefined;
};

const scene = (children: IR['children']): IR => ({
  version: 1,
  type: 'scene',
  children,
});

describe('Node 中心落两端点之间', () => {
  it('between_node_midpoint：A=[-120,0] B=[120,0] t=0.5 → 节点中心 [0,0]', () => {
    const ir = scene([
      { type: 'node', id: 'A', position: [-120, 0], text: 'A' },
      { type: 'node', id: 'B', position: [120, 0], text: 'B' },
      {
        type: 'node',
        id: 'mid',
        position: { between: [{ id: 'A' }, { id: 'B' }], t: 0.5 },
        text: 'mid',
      },
    ]);
    const all = rects(compileToScene(ir).primitives).map(rectCenter);
    const mid = all[2];
    expect(mid[0]).toBeCloseTo(0);
    expect(mid[1]).toBeCloseTo(0);
  });

  it('between_endpoint_cartesian：端点直接用笛卡尔坐标 t=0.5 → 中点', () => {
    const ir = scene([
      {
        type: 'node',
        id: 'mid',
        position: { between: [[-40, -40], [40, 40]], t: 0.5 },
        text: 'm',
      },
    ]);
    const [mid] = rects(compileToScene(ir).primitives).map(rectCenter);
    expect(mid[0]).toBeCloseTo(0);
    expect(mid[1]).toBeCloseTo(0);
  });
});

describe('Coordinate 注册位置落两端点之间', () => {
  it('between_coord_third：[[0,0],[90,0]] t≈0.333 → 注册中心 ≈[30,0]（被后续 path 引用验证）', () => {
    const ir = scene([
      {
        type: 'coordinate',
        id: 'm',
        position: { between: [[0, 0], [90, 0]], t: 0.333 },
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [200, 200] },
          { type: 'step', kind: 'line', to: { id: 'm' } },
        ],
      },
    ]);
    const end = firstLineTo(topPath(compileToScene(ir).primitives));
    expect(end).toBeDefined();
    expect(end![0]).toBeCloseTo(30, 0);
    expect(end![1]).toBeCloseTo(0);
  });
});

describe('Path step 端点落两端点之间', () => {
  it('between_step_to：Step.to=between(A, B) t=0.5 → path 端点落中点', () => {
    const ir = scene([
      { type: 'coordinate', id: 'A', position: [-50, 0] },
      { type: 'coordinate', id: 'B', position: [50, 0] },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 200] },
          {
            type: 'step',
            kind: 'line',
            to: { between: [{ id: 'A' }, { id: 'B' }], t: 0.5 },
          },
        ],
      },
    ]);
    const end = firstLineTo(topPath(compileToScene(ir).primitives));
    expect(end).toBeDefined();
    expect(end![0]).toBeCloseTo(0);
    expect(end![1]).toBeCloseTo(0);
  });
});

describe('比例 t 边界命中端点', () => {
  it('between_t0：t=0 → 落端点 A', () => {
    const ir = scene([
      { type: 'node', id: 'A', position: [-120, 0], text: 'A' },
      { type: 'node', id: 'B', position: [120, 0], text: 'B' },
      {
        type: 'node',
        id: 'p',
        position: { between: [{ id: 'A' }, { id: 'B' }], t: 0 },
        text: 'p',
      },
    ]);
    const all = rects(compileToScene(ir).primitives).map(rectCenter);
    const p = all[2];
    expect(p[0]).toBeCloseTo(-120);
    expect(p[1]).toBeCloseTo(0);
  });

  it('between_t1：t=1 → 落端点 B', () => {
    const ir = scene([
      { type: 'node', id: 'A', position: [-120, 0], text: 'A' },
      { type: 'node', id: 'B', position: [120, 0], text: 'B' },
      {
        type: 'node',
        id: 'p',
        position: { between: [{ id: 'A' }, { id: 'B' }], t: 1 },
        text: 'p',
      },
    ]);
    const all = rects(compileToScene(ir).primitives).map(rectCenter);
    const p = all[2];
    expect(p[0]).toBeCloseTo(120);
    expect(p[1]).toBeCloseTo(0);
  });
});

describe('嵌套 between 解析', () => {
  it('between_nested：between([ between([A,B],0.5), C ], 0.5) → 中点的中点', () => {
    // A=[0,0] B=[100,0] → inner mid=[50,0]; C=[50,100]
    // outer between([50,0],[50,100]) t=0.5 → [50,50]
    const ir = scene([
      { type: 'node', id: 'A', position: [0, 0], text: 'A' },
      { type: 'node', id: 'B', position: [100, 0], text: 'B' },
      { type: 'node', id: 'C', position: [50, 100], text: 'C' },
      {
        type: 'node',
        id: 'p',
        position: {
          between: [
            { between: [{ id: 'A' }, { id: 'B' }], t: 0.5 },
            { id: 'C' },
          ],
          t: 0.5,
        },
        text: 'p',
      },
    ]);
    const all = rects(compileToScene(ir).primitives).map(rectCenter);
    const p = all[3];
    expect(p[0]).toBeCloseTo(50);
    expect(p[1]).toBeCloseTo(50);
  });
});

describe('端点带 anchor 时用对应 anchor 点插值', () => {
  it('between_endpoint_anchor：端点 { id:"A", anchor:"north" } → lerp 用 A 的 north 点', () => {
    // 两个有尺寸的同款节点 A=[0,0] B=[0,200]（竖直排布）。
    // 用 north anchor：两端点都取各自 north（y 比中心小），t=0.5 → 中点 y 比两中心几何中点 y 小。
    const baseIr = scene([
      { type: 'node', id: 'A', position: [0, 0], text: 'AAA' },
      { type: 'node', id: 'B', position: [0, 200], text: 'BBB' },
      {
        type: 'node',
        id: 'm',
        position: {
          between: [
            { id: 'A', anchor: 'north' },
            { id: 'B', anchor: 'north' },
          ],
          t: 0.5,
        },
        text: 'm',
      },
    ]);
    const centerIr = scene([
      { type: 'node', id: 'A', position: [0, 0], text: 'AAA' },
      { type: 'node', id: 'B', position: [0, 200], text: 'BBB' },
      {
        type: 'node',
        id: 'm',
        position: {
          between: [
            { id: 'A', anchor: 'center' },
            { id: 'B', anchor: 'center' },
          ],
          t: 0.5,
        },
        text: 'm',
      },
    ]);
    const withNorth = rects(compileToScene(baseIr).primitives).map(rectCenter)[2];
    const withCenter = rects(compileToScene(centerIr).primitives).map(rectCenter)[2];
    // north anchor 比 center 在屏幕坐标里 y 更小（更靠上），两端同向偏移 → 中点 y 也更小
    expect(withNorth[1]).toBeLessThan(withCenter[1]);
    // x 不变（竖直排布，north 不偏 x）
    expect(withNorth[0]).toBeCloseTo(withCenter[0]);
  });
});

describe('transforms scope 内 between 投影', () => {
  it('between_in_scope：scope rotate(90) 内 between 中点投影到全局正确', () => {
    // scope rotate 90：局部 A=[100,0] B=[-100,0]，局部中点 [0,0]。
    // 局部中点 [0,0] 经 rotate 90 投全局仍 [0,0]——但端点偏移可见旋转：
    // 用非原点局部中点验证投影：A=[100,0] B=[100,200] 局部中点 [100,100] → rotate90 全局 ≈ [-100,100]
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'rotate', degrees: 90 }],
        children: [
          { type: 'node', id: 'A', position: [100, 0], text: 'A' },
          { type: 'node', id: 'B', position: [100, 200], text: 'B' },
          {
            type: 'node',
            id: 'm',
            position: { between: [{ id: 'A' }, { id: 'B' }], t: 0.5 },
            text: 'm',
          },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [300, 300] },
          { type: 'step', kind: 'line', to: { id: 'm' } },
        ],
      },
    ]);
    const end = firstLineTo(topPath(compileToScene(ir).primitives));
    expect(end).toBeDefined();
    // 局部中点 [100,100] 经 rotate 90（y 向下，cos90=0 sin90=1）：(x', y')=(-y, x)=(-100, 100)
    expect(end![0]).toBeCloseTo(-100, 0);
    expect(end![1]).toBeCloseTo(100, 0);
  });
});

describe('端点引用未定义节点不崩', () => {
  it('between_endpoint_unresolved：端点引用未定义 id → 发 warn 不抛错', () => {
    const ir = scene([
      { type: 'node', id: 'A', position: [0, 0], text: 'A' },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          {
            type: 'step',
            kind: 'line',
            to: { between: [{ id: 'A' }, { id: 'bogus' }], t: 0.5 },
          },
        ],
      },
    ]);
    const warnings: Array<CompileWarning> = [];
    expect(() => compileToScene(ir, { onWarn: w => warnings.push(w) })).not.toThrow();
    expect(warnings.length).toBeGreaterThan(0);
  });
});
