import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import { SceneSchema } from '../../src';
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

/** 递归收集所有数字字段，断言全 finite（守 Scene JSON round-trip） */
const allNumbersFinite = (value: unknown): boolean => {
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(allNumbersFinite);
  if (value && typeof value === 'object') {
    return Object.values(value).every(allNumbersFinite);
  }
  return true;
};

// ---------------------------------------------------------------------------
// 攻击面 1：scopeChain 投影正确性（scale / 多重 transform / 嵌套 scope）
// ---------------------------------------------------------------------------
describe('between 在带 scale / 复合 transform 的 scope 内投影到正确全局坐标', () => {
  it('scale_scope：scope scale(2) 内 between 局部中点 [50,50] → 全局 [100,100]', () => {
    // 局部 A=[0,0] B=[100,100] → 局部中点 [50,50]；scale(2) → 全局 [100,100]。
    // 用 Coordinate + path anchor:center 间接读精确中心。
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'scale', x: 2 }],
        children: [
          { type: 'coordinate', id: 'A', position: [0, 0] },
          { type: 'coordinate', id: 'B', position: [100, 100] },
          {
            type: 'coordinate',
            id: 'm',
            position: { between: [{ id: 'A' }, { id: 'B' }], t: 0.5 },
          },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [500, 500] },
          { type: 'step', kind: 'line', to: { id: 'm' } },
        ],
      },
    ]);
    const end = firstLineTo(topPath(compileToScene(ir).primitives));
    expect(end).toBeDefined();
    expect(end![0]).toBeCloseTo(100, 1);
    expect(end![1]).toBeCloseTo(100, 1);
  });

  it('rotate+scale+translate 复合：节点中心经完整 chain 投影正确', () => {
    // chain = [rotate(90), scale(2), translate(10,0)]（数组序：rotate 最外层、最后 apply）。
    // 局部 A=[0,0] B=[20,0] → 局部中点 [10,0]。
    // 内层 translate(10,0): [10,0]→[20,0]; scale(2): →[40,0]; rotate(90) (y下): (x',y')=(-y,x)=[0,40]。
    const ir = scene([
      {
        type: 'scope',
        transforms: [
          { kind: 'rotate', degrees: 90 },
          { kind: 'scale', x: 2 },
          { kind: 'translate', x: 10, y: 0 },
        ],
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          { type: 'node', id: 'B', position: [20, 0], text: 'B' },
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
          { type: 'step', kind: 'move', to: [500, 500] },
          { type: 'step', kind: 'line', to: { id: 'm', anchor: 'center' } },
        ],
      },
    ]);
    const end = firstLineTo(topPath(compileToScene(ir).primitives));
    expect(end).toBeDefined();
    expect(end![0]).toBeCloseTo(0, 0);
    expect(end![1]).toBeCloseTo(40, 0);
  });

  it('非均匀 scale(x=2,y=3)：between 中点 x/y 各自缩放', () => {
    // 局部 A=[0,0] B=[10,10] → 局部中点 [5,5]；scale(x=2,y=3) → 全局 [10,15]。
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'scale', x: 2, y: 3 }],
        children: [
          { type: 'coordinate', id: 'A', position: [0, 0] },
          { type: 'coordinate', id: 'B', position: [10, 10] },
          {
            type: 'coordinate',
            id: 'm',
            position: { between: [{ id: 'A' }, { id: 'B' }], t: 0.5 },
          },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [500, 500] },
          { type: 'step', kind: 'line', to: { id: 'm' } },
        ],
      },
    ]);
    const end = firstLineTo(topPath(compileToScene(ir).primitives));
    expect(end).toBeDefined();
    expect(end![0]).toBeCloseTo(10, 1);
    expect(end![1]).toBeCloseTo(15, 1);
  });

  it('嵌套 scope：外 translate(100,0) + 内 rotate(90)，between 中点投全局', () => {
    // 内层局部 A=[0,0] B=[0,40] → 内层局部中点 [0,20]。
    // 内 rotate(90)(y下): [0,20]→(-20,0); 外 translate(100,0): →[80,0]。
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'translate', x: 100, y: 0 }],
        children: [
          {
            type: 'scope',
            transforms: [{ kind: 'rotate', degrees: 90 }],
            children: [
              { type: 'coordinate', id: 'A', position: [0, 0] },
              { type: 'coordinate', id: 'B', position: [0, 40] },
              {
                type: 'coordinate',
                id: 'm',
                position: { between: [{ id: 'A' }, { id: 'B' }], t: 0.5 },
              },
            ],
          },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [500, 500] },
          { type: 'step', kind: 'line', to: { id: 'm' } },
        ],
      },
    ]);
    const end = firstLineTo(topPath(compileToScene(ir).primitives));
    expect(end).toBeDefined();
    expect(end![0]).toBeCloseTo(80, 1);
    expect(end![1]).toBeCloseTo(0, 1);
  });

  it('端点引用 scope 外节点：between 在 scope 内但端点是全局节点，投影正确', () => {
    // 顶层 A=[0,0] B=[200,0]（全局）。scope scale(2) 内 between({id:A},{id:B}) t=0.5。
    // refPointOfTarget 拿到全局中点 [100,0]；resolveBetweenGlobal 返回全局 [100,0]；
    // resolvePosition 反投影回局部 [50,0]；caller applyTransformChain(scale2) → [100,0]。
    // 即结果应为全局中点 [100,0]，不受 scope scale 二次缩放。
    const ir = scene([
      { type: 'coordinate', id: 'A', position: [0, 0] },
      { type: 'coordinate', id: 'B', position: [200, 0] },
      {
        type: 'scope',
        transforms: [{ kind: 'scale', x: 2 }],
        children: [
          {
            type: 'coordinate',
            id: 'm',
            position: { between: [{ id: 'A' }, { id: 'B' }], t: 0.5 },
          },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [500, 500] },
          { type: 'step', kind: 'line', to: { id: 'm' } },
        ],
      },
    ]);
    const end = firstLineTo(topPath(compileToScene(ir).primitives));
    expect(end).toBeDefined();
    expect(end![0]).toBeCloseTo(100, 1);
    expect(end![1]).toBeCloseTo(0, 1);
  });
});

// ---------------------------------------------------------------------------
// 攻击面 2：嵌套 between 深度 + 混极坐标 / offset 端点
// ---------------------------------------------------------------------------
describe('深层嵌套 between + 端点混极坐标 / offset', () => {
  it('3 层嵌套 between 解析正确不栈溢出', () => {
    // L0 = between([0,0],[8,0]) t=0.5 = [4,0]
    // L1 = between(L0, [8,8]) t=0.5 = between([4,0],[8,8]) t=0.5 = [6,4]
    // L2 = between(L1, [0,8]) t=0.5 = between([6,4],[0,8]) t=0.5 = [3,6]
    const ir = scene([
      {
        type: 'coordinate',
        id: 'm',
        position: {
          between: [
            {
              between: [
                { between: [[0, 0], [8, 0]], t: 0.5 },
                [8, 8],
              ],
              t: 0.5,
            },
            [0, 8],
          ],
          t: 0.5,
        },
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [500, 500] },
          { type: 'step', kind: 'line', to: { id: 'm' } },
        ],
      },
    ]);
    const end = firstLineTo(topPath(compileToScene(ir).primitives));
    expect(end).toBeDefined();
    expect(end![0]).toBeCloseTo(3, 1);
    expect(end![1]).toBeCloseTo(6, 1);
  });

  it('端点为极坐标：between([polar 0°/100],[polar 90°/100]) t=0.5', () => {
    // polar angle 0 radius 100 → [100,0]; polar angle 90 radius 100 → [0,100]（y 向下）。
    // 中点 [50,50]。
    const ir = scene([
      {
        type: 'coordinate',
        id: 'm',
        position: {
          between: [
            { angle: 0, radius: 100 },
            { angle: 90, radius: 100 },
          ],
          t: 0.5,
        },
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [500, 500] },
          { type: 'step', kind: 'line', to: { id: 'm' } },
        ],
      },
    ]);
    const end = firstLineTo(topPath(compileToScene(ir).primitives));
    expect(end).toBeDefined();
    expect(end![0]).toBeCloseTo(50, 1);
    expect(end![1]).toBeCloseTo(50, 1);
  });

  it('端点为 offset：between([{of:N,offset:[10,0]}],[{of:N,offset:[-10,0]}]) t=0.5 → N 中心', () => {
    const ir = scene([
      { type: 'coordinate', id: 'N', position: [42, 7] },
      {
        type: 'coordinate',
        id: 'm',
        position: {
          between: [
            { of: 'N', offset: [10, 0] },
            { of: 'N', offset: [-10, 0] },
          ],
          t: 0.5,
        },
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [500, 500] },
          { type: 'step', kind: 'line', to: { id: 'm' } },
        ],
      },
    ]);
    const end = firstLineTo(topPath(compileToScene(ir).primitives));
    expect(end).toBeDefined();
    expect(end![0]).toBeCloseTo(42, 1);
    expect(end![1]).toBeCloseTo(7, 1);
  });
});

// ---------------------------------------------------------------------------
// 攻击面 3：非 finite / JSON 可序列化
// ---------------------------------------------------------------------------
describe('非 finite 端点不进 Scene；带 between 的 Scene round-trip', () => {
  it('端点极坐标 radius=Infinity（手搓绕过 schema）→ 不产生非 finite 进 Scene', () => {
    // PolarPositionSchema.radius .finite() 会拒，但 compileToScene 直接吃手搓 IR 绕过。
    // 端点解析出 Infinity → lerp 出 Infinity；正确行为：要么 warn + 不进 Scene，
    // 绝不能让 Infinity 污染 Scene 坐标。
    const ir = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'coordinate',
          id: 'm',
          position: {
            between: [
              { angle: 0, radius: Number.POSITIVE_INFINITY },
              { angle: 90, radius: 100 },
            ],
            t: 0.5,
          },
        },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: { id: 'm' } },
          ],
        },
      ],
    } as unknown as IR;
    const warnings: Array<CompileWarning> = [];
    // 契约：非 finite 端点要么编译期干净抛（Coordinate 位置不可解析），要么不让非 finite 进 Scene
    let scn: ReturnType<typeof compileToScene> | undefined;
    try {
      scn = compileToScene(ir, { onWarn: w => warnings.push(w) });
    } catch {
      scn = undefined;
    }
    if (scn) {
      expect(allNumbersFinite(scn.primitives)).toBe(true);
      expect(allNumbersFinite(scn.layout)).toBe(true);
    }
  });

  it('端点 offset 含 NaN（手搓绕过 schema）→ 非 finite 不进 Scene', () => {
    const ir = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'coordinate', id: 'N', position: [0, 0] },
        {
          type: 'coordinate',
          id: 'm',
          position: {
            between: [
              { of: 'N', offset: [Number.NaN, 0] },
              [10, 0],
            ],
            t: 0.5,
          },
        },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: { id: 'm' } },
          ],
        },
      ],
    } as unknown as IR;
    const warnings: Array<CompileWarning> = [];
    let scn: ReturnType<typeof compileToScene> | undefined;
    try {
      scn = compileToScene(ir, { onWarn: w => warnings.push(w) });
    } catch {
      scn = undefined;
    }
    // 契约：非 finite 端点要么编译期干净抛（Coordinate 位置不可解析，与既有同口径），要么不让非 finite 进 Scene
    if (scn) {
      expect(allNumbersFinite(scn.primitives)).toBe(true);
      expect(allNumbersFinite(scn.layout)).toBe(true);
    }
  });

  it('带 between 的 IR round-trip：SceneSchema.parse(JSON.parse(JSON.stringify(ir))) 保真', () => {
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
    const roundTripped = JSON.parse(JSON.stringify(ir));
    expect(() => SceneSchema.parse(roundTripped)).not.toThrow();
    const parsed = SceneSchema.parse(roundTripped);
    // 解析后再编译，结果与原 IR 编译一致（中点 [0,0]）
    const all = rects(compileToScene(parsed).primitives).map(rectCenter);
    expect(all[2][0]).toBeCloseTo(0);
    expect(all[2][1]).toBeCloseTo(0);
  });
});

// ---------------------------------------------------------------------------
// 攻击面 4：未解析端点（前向引用 / 一端 bogus / 两端 bogus）
// ---------------------------------------------------------------------------
describe('未解析端点：前向引用 / bogus 端点应 warn 不崩', () => {
  it('Step.to between 前向引用：引用 IR 中靠后定义的 coordinate', () => {
    // A 在 path 之前、B 在 path 之后定义。path 端点解析在所有 register 完成后统一进行，
    // 前向引用应能命中。中点 [0,0]。
    const ir = scene([
      { type: 'coordinate', id: 'A', position: [-50, 0] },
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
      { type: 'coordinate', id: 'B', position: [50, 0] },
    ]);
    const warnings: Array<CompileWarning> = [];
    const scn = compileToScene(ir, { onWarn: w => warnings.push(w) });
    const end = firstLineTo(topPath(scn.primitives));
    expect(end).toBeDefined();
    expect(end![0]).toBeCloseTo(0);
    expect(end![1]).toBeCloseTo(0);
    expect(warnings.length).toBe(0);
  });

  it('Step.to between 两端都 bogus → warn 不抛', () => {
    const ir = scene([
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          {
            type: 'step',
            kind: 'line',
            to: { between: [{ id: 'nope1' }, { id: 'nope2' }], t: 0.5 },
          },
        ],
      },
    ]);
    const warnings: Array<CompileWarning> = [];
    expect(() => compileToScene(ir, { onWarn: w => warnings.push(w) })).not.toThrow();
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('Node.position between 端点 bogus → 干净抛错（与既有 Node 位置未解析同口径），不产错坐标', () => {
    // 既有契约（node-offset-adversarial）：未解析 Node 位置抛 `Cannot resolve position`。
    // between bogus 端点应同口径——干净抛错，绝不静默吃下产错坐标。
    const ir = scene([
      { type: 'node', id: 'A', position: [0, 0], text: 'A' },
      {
        type: 'node',
        id: 'mid',
        position: { between: [{ id: 'A' }, { id: 'bogus' }], t: 0.5 },
        text: 'mid',
      },
    ]);
    expect(() => compileToScene(ir, { onWarn: () => {} })).toThrow(/Cannot resolve position/);
  });

  it('Coordinate.position between 端点 bogus → 干净抛错，不产错坐标', () => {
    const ir = scene([
      { type: 'coordinate', id: 'A', position: [0, 0] },
      {
        type: 'coordinate',
        id: 'mid',
        position: { between: [{ id: 'A' }, { id: 'bogus' }], t: 0.5 },
      },
    ]);
    expect(() => compileToScene(ir, { onWarn: () => {} })).toThrow(/Cannot resolve position/);
  });
});

// ---------------------------------------------------------------------------
// 攻击面 5：t 边界 / 退化（手搓绕过 schema 喂越界 t / NaN）
// ---------------------------------------------------------------------------
describe('t 退化与越界（手搓绕过 schema）', () => {
  it('A==B 两端点重合任意 t → 落重合点（不 NaN）', () => {
    const ir = scene([
      {
        type: 'coordinate',
        id: 'm',
        position: { between: [[33, 44], [33, 44]], t: 0.5 },
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [500, 500] },
          { type: 'step', kind: 'line', to: { id: 'm' } },
        ],
      },
    ]);
    const end = firstLineTo(topPath(compileToScene(ir).primitives));
    expect(end).toBeDefined();
    expect(end![0]).toBeCloseTo(33);
    expect(end![1]).toBeCloseTo(44);
  });

  it('手搓 t=NaN → 非 finite lerp 结果不进 Scene', () => {
    const ir = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'coordinate',
          id: 'm',
          position: { between: [[0, 0], [100, 0]], t: Number.NaN },
        },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: { id: 'm' } },
          ],
        },
      ],
    } as unknown as IR;
    const warnings: Array<CompileWarning> = [];
    // t=NaN → lerp 出 NaN：要么干净抛（Coordinate 不可解析），要么 NaN 绝不进 Scene（JSON 序列化变 null 破坏 round-trip）
    let scn: ReturnType<typeof compileToScene> | undefined;
    try {
      scn = compileToScene(ir, { onWarn: w => warnings.push(w) });
    } catch {
      scn = undefined;
    }
    if (scn) {
      expect(allNumbersFinite(scn.primitives)).toBe(true);
      expect(allNumbersFinite(scn.layout)).toBe(true);
    }
  });

  it('手搓 t=1.5 外插：若外插点进 Scene 必须 finite（不产 NaN/Infinity）', () => {
    // schema 严格 [0,1]，但手搓绕过。外插 lerp([0,0],[100,0],1.5)=[150,0] 仍 finite，
    // 进 Scene 不违反 finite 守卫——本 case 验证外插不产生非 finite。
    const ir = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'coordinate',
          id: 'm',
          position: { between: [[0, 0], [100, 0]], t: 1.5 },
        },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: { id: 'm' } },
          ],
        },
      ],
    } as unknown as IR;
    const scn = compileToScene(ir);
    expect(allNumbersFinite(scn.primitives)).toBe(true);
    expect(allNumbersFinite(scn.layout)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 攻击面 6：AbsoluteTarget 排除 relative（手搓喂 relative 端点）
// ---------------------------------------------------------------------------
describe('between 端点为 relative（手搓绕过 schema）应被拒绝，不崩、不产错坐标', () => {
  it('Step.to between 端点 {relative} → 端点解析 null → warn 不崩，不产非 finite', () => {
    const ir = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'coordinate', id: 'A', position: [0, 0] },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            {
              type: 'step',
              kind: 'line',
              to: { between: [{ id: 'A' }, { relative: [10, 10] }], t: 0.5 },
            },
          ],
        },
      ],
    } as unknown as IR;
    const warnings: Array<CompileWarning> = [];
    const scn = compileToScene(ir, { onWarn: w => warnings.push(w) });
    expect(allNumbersFinite(scn.primitives)).toBe(true);
    // relative 端点 → refPointOfTarget 守卫返回 null → between 失败 → 应 warn
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('Node.position between 端点 {relative} → 干净抛错，不产错坐标', () => {
    // relative 端点在 between 内无意义 → refPointOfTarget 守卫返回 null → between 失败 →
    // Node 位置未解析 → 干净抛错（与 bogus 端点同口径），绝不产错坐标进 Scene。
    const ir = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0], text: 'A' },
        {
          type: 'node',
          id: 'mid',
          position: { between: [{ id: 'A' }, { relative: [10, 10] }], t: 0.5 },
          text: 'mid',
        },
      ],
    } as unknown as IR;
    expect(() => compileToScene(ir, { onWarn: () => {} })).toThrow(/Cannot resolve position/);
  });
});

// ---------------------------------------------------------------------------
// 攻击面 7：端点带 anchor / offset 的 lerp 正确
// ---------------------------------------------------------------------------
describe('端点带 anchor / offset 的 lerp', () => {
  it('端点 { id, anchor:{side,t} } 边上比例点 lerp 正确', () => {
    // A 是有尺寸节点 [0,0]，端点 A.east 的 {side:east,t:0.5} = east 中点（east anchor）。
    // B=[200,0] 是 0×0 coordinate。between(A.east, B) t=0.5。
    // 期望：x = (A.east.x + 200)/2，y = 0（east anchor y 与中心同）。A.east.x > 0。
    const ir = scene([
      { type: 'node', id: 'A', position: [0, 0], text: 'AAAA' },
      { type: 'coordinate', id: 'B', position: [200, 0] },
      {
        type: 'coordinate',
        id: 'm',
        position: {
          between: [
            { id: 'A', anchor: { side: 'east', t: 0.5 } },
            { id: 'B' },
          ],
          t: 0.5,
        },
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [500, 500] },
          { type: 'step', kind: 'line', to: { id: 'm' } },
        ],
      },
    ]);
    // 同时算一个 center anchor 版做对照：A.center=[0,0]，between([0,0],[200,0]) t=0.5 = [100,0]。
    const irCenter = scene([
      { type: 'node', id: 'A', position: [0, 0], text: 'AAAA' },
      { type: 'coordinate', id: 'B', position: [200, 0] },
      {
        type: 'coordinate',
        id: 'm',
        position: {
          between: [
            { id: 'A', anchor: 'center' },
            { id: 'B' },
          ],
          t: 0.5,
        },
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [500, 500] },
          { type: 'step', kind: 'line', to: { id: 'm' } },
        ],
      },
    ]);
    const endEast = firstLineTo(topPath(compileToScene(ir).primitives));
    const endCenter = firstLineTo(topPath(compileToScene(irCenter).primitives));
    expect(endEast).toBeDefined();
    expect(endCenter).toBeDefined();
    // east anchor 在 A 中心右侧 → A 端点 x 更大 → 中点 x 比 center 版更大
    expect(endEast![0]).toBeGreaterThan(endCenter![0]);
    expect(endEast![1]).toBeCloseTo(0);
  });

  it('端点 { id, offset:[dx,dy] } 世界系 offset 后再 lerp', () => {
    // A=[0,0] offset[0,20]; B=[100,0] offset[0,20]. between t=0.5 → [50,20]。
    const ir = scene([
      { type: 'coordinate', id: 'A', position: [0, 0] },
      { type: 'coordinate', id: 'B', position: [100, 0] },
      {
        type: 'coordinate',
        id: 'm',
        position: {
          between: [
            { id: 'A', offset: [0, 20] },
            { id: 'B', offset: [0, 20] },
          ],
          t: 0.5,
        },
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [500, 500] },
          { type: 'step', kind: 'line', to: { id: 'm' } },
        ],
      },
    ]);
    const end = firstLineTo(topPath(compileToScene(ir).primitives));
    expect(end).toBeDefined();
    expect(end![0]).toBeCloseTo(50, 1);
    expect(end![1]).toBeCloseTo(20, 1);
  });
});
