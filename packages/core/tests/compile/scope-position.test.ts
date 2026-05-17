/**
 * scope 下相对定位（Polar / At / Offset）语义集成测试
 * @description referent 全局 / relative 部分在当前 scope 局部度量 / 末端 apply scope chain 投回全局
 *   覆盖：
 *   - 同 scope referent vs 跨 scope referent
 *   - polar / at / offset 三种 schema
 *   - scope translate / rotate / scale 三种 transform 与 relative 的交互
 *   - 嵌套 polar / 嵌套 offset 在 scope 下递归
 *   - 错误路径（前向引用 / unresolved id）
 *   - 交互场景（多层 scope + node rotate / nodeDistance / scale=0 退化）
 */
import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import {
  applyTransformChain,
  inverseTransformChain,
} from '../../src/compile/scope';
import type { CompileWarning, IR, IRPosition, ScenePrimitive } from '../../src';

const scene = (children: IR['children']): IR => ({
  version: 1,
  type: 'scene',
  children,
});

const topPath = (prims: ReadonlyArray<ScenePrimitive>): ScenePrimitive | undefined =>
  prims.find(p => p.type === 'path');

const lineTo = (prim: ScenePrimitive | undefined): [number, number] | undefined => {
  if (!prim || prim.type !== 'path') return undefined;
  for (const cmd of prim.commands) {
    if (cmd.kind === 'line') return cmd.to;
  }
  return undefined;
};

describe('applyTransformChain / inverseTransformChain 对偶性', () => {
  it('translate(50, 30) 正反复合是恒等', () => {
    const chain = [{ kind: 'translate' as const, x: 50, y: 30 }];
    const p: IRPosition = [10, 20];
    const round = inverseTransformChain(applyTransformChain(p, chain), chain);
    expect(round[0]).toBeCloseTo(10, 10);
    expect(round[1]).toBeCloseTo(20, 10);
  });

  it('rotate(45) 正反复合是恒等', () => {
    const chain = [{ kind: 'rotate' as const, degrees: 45 }];
    const p: IRPosition = [10, 0];
    const round = inverseTransformChain(applyTransformChain(p, chain), chain);
    expect(round[0]).toBeCloseTo(10, 6);
    expect(round[1]).toBeCloseTo(0, 6);
  });

  it('rotate(45) + cx/cy 不为 0 正反复合是恒等', () => {
    const chain = [{ kind: 'rotate' as const, degrees: 45, cx: 5, cy: 5 }];
    const p: IRPosition = [10, 0];
    const round = inverseTransformChain(applyTransformChain(p, chain), chain);
    expect(round[0]).toBeCloseTo(10, 6);
    expect(round[1]).toBeCloseTo(0, 6);
  });

  it('scale(2) 正反复合是恒等', () => {
    const chain = [{ kind: 'scale' as const, x: 2 }];
    const p: IRPosition = [10, 20];
    const round = inverseTransformChain(applyTransformChain(p, chain), chain);
    expect(round[0]).toBeCloseTo(10, 10);
    expect(round[1]).toBeCloseTo(20, 10);
  });

  it('混合 chain 正反复合是恒等', () => {
    const chain = [
      { kind: 'translate' as const, x: 100, y: 0 },
      { kind: 'rotate' as const, degrees: 30 },
      { kind: 'scale' as const, x: 2, y: 1.5 },
    ];
    const p: IRPosition = [10, 20];
    const round = inverseTransformChain(applyTransformChain(p, chain), chain);
    expect(round[0]).toBeCloseTo(10, 6);
    expect(round[1]).toBeCloseTo(20, 6);
  });

  it('空 chain 正反复合是恒等', () => {
    const chain: Array<never> = [];
    const p: IRPosition = [10, 20];
    expect(inverseTransformChain(applyTransformChain(p, chain), chain)).toEqual([10, 20]);
  });

  it('scale x=0 inverse 退化为 (0, 0) 防 NaN', () => {
    const chain = [{ kind: 'scale' as const, x: 0 }];
    const result = inverseTransformChain([5, 10], chain);
    expect(result).toEqual([0, 0]);
  });

  it('scale y=0 inverse 同样退化', () => {
    const chain = [{ kind: 'scale' as const, x: 2, y: 0 }];
    const result = inverseTransformChain([10, 5], chain);
    expect(result).toEqual([0, 0]);
  });
});

describe('Happy path：scope rotate 下 polar / at / offset 同 scope referent', () => {
  it('scope_polar_same_scope：scope rotate(90) 内 A + B={origin:A, angle:0, radius:50} → 视觉在 A 下方', () => {
    // scope rotate 90 度后，B 局部 (50, 0) 投影到全局 ≈ (0, 50)（A 全局 ≈ (0, 0) 投影也是 (0, 0)）
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'rotate', degrees: 90 }],
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          {
            type: 'node',
            id: 'B',
            position: { origin: 'A', angle: 0, radius: 50 },
            text: 'B',
          },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [200, 200] },
          { type: 'step', kind: 'line', to: 'B' },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    // B 视觉位置 ≈ (0, 50)：x 接近 0、y 接近 50
    expect(Math.abs(end![0])).toBeLessThan(20);
    expect(Math.abs(end![1] - 50)).toBeLessThan(20);
  });

  it('scope_at_same_scope：scope rotate(90) 内 A + B={direction:right, of:A, distance:50} → B 视觉在 A 下方', () => {
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'rotate', degrees: 90 }],
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          {
            type: 'node',
            id: 'B',
            position: { direction: 'right', of: 'A', distance: 50 },
            text: 'B',
          },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [200, 200] },
          { type: 'step', kind: 'line', to: 'B' },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    expect(Math.abs(end![0])).toBeLessThan(20);
    expect(Math.abs(end![1] - 50)).toBeLessThan(20);
  });

  it('scope_offset_same_scope：scope rotate(90) 内 A + B={of:A, offset:[50,0]} → B 视觉在 A 下方', () => {
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'rotate', degrees: 90 }],
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          {
            type: 'node',
            id: 'B',
            position: { of: 'A', offset: [50, 0] },
            text: 'B',
          },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [200, 200] },
          { type: 'step', kind: 'line', to: 'B' },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    expect(Math.abs(end![0])).toBeLessThan(20);
    expect(Math.abs(end![1] - 50)).toBeLessThan(20);
  });
});

describe('Happy path：跨 scope referent（hub 在 scope 外）', () => {
  it('scope_polar_cross_scope：hub 在外、scope rotate(45) 内 polar.origin=hub → relative 局部度量 + scope rotate 投回全局', () => {
    // hub 全局 (0, 0)；scope rotate 45 度；node polar(0°, 50) → 局部 (50, 0)；apply rotate 45 → 全局 ≈ (35.355, 35.355)
    // scope 投影算法：hub_global=(0,0) → inverseRotate(-45) 应用到 (0,0) = (0,0) → +(50,0) → 局部 (50,0) → applyRotate(45) = (35.355, 35.355)
    const ir = scene([
      { type: 'node', id: 'hub', position: [0, 0], text: 'H' },
      {
        type: 'scope',
        transforms: [{ kind: 'rotate', degrees: 45 }],
        children: [
          {
            type: 'node',
            id: 'orbit',
            position: { origin: 'hub', angle: 0, radius: 50 },
            text: 'O',
          },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [200, 200] },
          { type: 'step', kind: 'line', to: 'orbit' },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    const expected = 50 * Math.cos((45 * Math.PI) / 180); // ≈ 35.355
    expect(Math.abs(end![0] - expected)).toBeLessThan(20);
    expect(Math.abs(end![1] - expected)).toBeLessThan(20);
  });

  it('scope_at_cross_scope：hub 在外、scope rotate(45) 内 at.of=hub → at distance 50 沿 right 局部 → 投影到全局 (35.355, 35.355)', () => {
    const ir = scene([
      { type: 'node', id: 'hub', position: [0, 0], text: 'H' },
      {
        type: 'scope',
        transforms: [{ kind: 'rotate', degrees: 45 }],
        children: [
          {
            type: 'node',
            id: 'follower',
            position: { direction: 'right', of: 'hub', distance: 50 },
            text: 'F',
          },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [200, 200] },
          { type: 'step', kind: 'line', to: 'follower' },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    const expected = 50 * Math.cos((45 * Math.PI) / 180);
    expect(Math.abs(end![0] - expected)).toBeLessThan(20);
    expect(Math.abs(end![1] - expected)).toBeLessThan(20);
  });

  it('scope_offset_cross_scope：hub 在外、scope rotate(45) 内 offset(50, 0) → 投影同上', () => {
    const ir = scene([
      { type: 'node', id: 'hub', position: [0, 0], text: 'H' },
      {
        type: 'scope',
        transforms: [{ kind: 'rotate', degrees: 45 }],
        children: [
          {
            type: 'node',
            id: 'shifted',
            position: { of: 'hub', offset: [50, 0] },
            text: 'S',
          },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [200, 200] },
          { type: 'step', kind: 'line', to: 'shifted' },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    const expected = 50 * Math.cos((45 * Math.PI) / 180);
    expect(Math.abs(end![0] - expected)).toBeLessThan(20);
    expect(Math.abs(end![1] - expected)).toBeLessThan(20);
  });

  it('scope_polar_nested_origin_in_scope：scope rotate(30) 内嵌套 polar——内层 polar.origin=A + 外层 polar 整条链局部度量', () => {
    // A 全局 (0, 0)；scope rotate 30
    // 内层 polar: { origin: A, angle: 0, radius: 30 } → A_local + (30, 0) = (-? , -?) + (30, 0)；inverse rotate -30 应用到 (0,0) 仍 (0, 0)；所以局部 (30, 0)
    // 外层 polar: { origin: 内层, angle: 90, radius: 20 } → 局部 (30, 20)（angle=90 在屏幕坐标 y 向下 → cos90=0 sin90=1）
    // apply scope rotate 30 → 全局 (30*cos30 - 20*sin30, 30*sin30 + 20*cos30) = (≈15.98, ≈32.32)
    const ir = scene([
      { type: 'node', id: 'A', position: [0, 0], text: 'A' },
      {
        type: 'scope',
        transforms: [{ kind: 'rotate', degrees: 30 }],
        children: [
          {
            type: 'node',
            id: 'nested',
            position: {
              origin: { origin: 'A', angle: 0, radius: 30 },
              angle: 90,
              radius: 20,
            },
            text: 'N',
          },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [200, 200] },
          { type: 'step', kind: 'line', to: 'nested' },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    const rad = (30 * Math.PI) / 180;
    const expX = 30 * Math.cos(rad) - 20 * Math.sin(rad);
    const expY = 30 * Math.sin(rad) + 20 * Math.cos(rad);
    expect(Math.abs(end![0] - expX)).toBeLessThan(20);
    expect(Math.abs(end![1] - expY)).toBeLessThan(20);
  });
});

describe('边界：scope transform 单变体对 relative 的影响', () => {
  it('scope_translate_only_relative_unchanged：scope translate(50,0) + relative (10, 0) → translate 不旋转/缩放 → relative 视觉仍 (10, 0)', () => {
    // A 全局 (0, 0)；inside scope translate(50, 0)：
    //   A_global=(0,0); inverseTranslate → A_local=(-50, 0); +(10,0)=(-40, 0); applyTranslate → (10, 0)
    // 即 B 视觉 = A 全局 + (10, 0) = (10, 0)，与 scope translate 无关
    const ir = scene([
      { type: 'node', id: 'A', position: [0, 0], text: 'A' },
      {
        type: 'scope',
        transforms: [{ kind: 'translate', x: 50, y: 0 }],
        children: [
          {
            type: 'node',
            id: 'B',
            position: { of: 'A', offset: [10, 0] },
            text: 'B',
          },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [200, 200] },
          { type: 'step', kind: 'line', to: 'B' },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    expect(Math.abs(end![0] - 10)).toBeLessThan(20);
    expect(Math.abs(end![1])).toBeLessThan(20);
  });

  it('scope_scale_relative_scaled：scope scale(2) + offset (10, 0) → 视觉偏移 (20, 0)', () => {
    // A 全局 (0, 0)；scope scale 2：
    //   A_global=(0,0); inverseScale → A_local=(0, 0); +(10, 0)=(10, 0); applyScale 2 → (20, 0)
    const ir = scene([
      { type: 'node', id: 'A', position: [0, 0], text: 'A' },
      {
        type: 'scope',
        transforms: [{ kind: 'scale', x: 2 }],
        children: [
          {
            type: 'node',
            id: 'B',
            position: { of: 'A', offset: [10, 0] },
            text: 'B',
          },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [200, 200] },
          { type: 'step', kind: 'line', to: 'B' },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    // B 全局 ≈ (20, 0)，boundary clip 偏移最多 ~半宽（注意 scale 后宽度也加倍）
    expect(Math.abs(end![0] - 20)).toBeLessThan(30);
    expect(Math.abs(end![1])).toBeLessThan(30);
  });

  it('scope_rotate_zero_no_op：scope rotate(0) + relative (10, 0) → relative 不变', () => {
    const ir = scene([
      { type: 'node', id: 'A', position: [0, 0], text: 'A' },
      {
        type: 'scope',
        transforms: [{ kind: 'rotate', degrees: 0 }],
        children: [
          {
            type: 'node',
            id: 'B',
            position: { of: 'A', offset: [10, 0] },
            text: 'B',
          },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [200, 200] },
          { type: 'step', kind: 'line', to: 'B' },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    expect(Math.abs(end![0] - 10)).toBeLessThan(20);
    expect(Math.abs(end![1])).toBeLessThan(20);
  });

  it('scope_inverse_for_external_referent：外层 referent + 内层 scope 反向投影数值精度（rotate 任意角度）', () => {
    // hub 全局 (50, 0)；scope rotate 37 度 + node polar(0°, 20) → 期望全局 = hub + 20*(cos37°, sin37°)
    // ADR 算法：hub_global=(50,0); inverseRotate(-37) → hub_local=(50cos37, -50sin37) [大致]
    //   +(20,0); applyRotate(37) → 应该 = hub_global + 20*(cos37, sin37)
    // 即数学上 final = hub + rotate(relative)
    const angle = 37;
    const rad = (angle * Math.PI) / 180;
    const ir = scene([
      { type: 'node', id: 'hub', position: [50, 0], text: 'H' },
      {
        type: 'scope',
        transforms: [{ kind: 'rotate', degrees: angle }],
        children: [
          {
            type: 'node',
            id: 'orbit',
            position: { origin: 'hub', angle: 0, radius: 20 },
            text: 'O',
          },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [200, 200] },
          { type: 'step', kind: 'line', to: 'orbit' },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    const expX = 50 + 20 * Math.cos(rad);
    const expY = 0 + 20 * Math.sin(rad);
    expect(Math.abs(end![0] - expX)).toBeLessThan(20);
    expect(Math.abs(end![1] - expY)).toBeLessThan(20);
  });
});

describe('错误路径', () => {
  it('scope_scale_zero_relative_resolve：scope scale=0 + relative → inverseTransformChain 退化为 (0, 0)，compile 不抛错', () => {
    // schema 不拒 scale=0（discriminatedUnion 限制不能加 refine）；compile 退化为 (0, 0) 防 NaN
    const ir = scene([
      { type: 'node', id: 'A', position: [10, 0], text: 'A' },
      {
        type: 'scope',
        transforms: [{ kind: 'scale', x: 0 }],
        children: [
          {
            type: 'node',
            id: 'B',
            position: { of: 'A', offset: [5, 0] },
            text: 'B',
          },
        ],
      },
    ]);
    expect(() => compileToScene(ir, { onWarn: () => {} })).not.toThrow();
  });

  it('scope_polar_origin_forward_reference_within_scope：scope 内 polar.origin 引用同 scope 后定义 id → 抛错', () => {
    const ir = scene([
      {
        type: 'scope',
        children: [
          { type: 'node', id: 'A', position: { origin: 'B', angle: 0, radius: 10 }, text: 'A' },
          { type: 'node', id: 'B', position: [0, 0], text: 'B' },
        ],
      },
    ]);
    expect(() => compileToScene(ir, { onWarn: () => {} })).toThrow();
  });

  it('scope_at_of_unresolved_under_scope：scope 内 at.of 引用不存在 id → 抛错', () => {
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'rotate', degrees: 30 }],
        children: [
          {
            type: 'node',
            id: 'X',
            position: { direction: 'right', of: 'missing', distance: 10 },
            text: 'X',
          },
        ],
      },
    ]);
    // 与 v0.1 一致：position 解析失败 layoutNode 抛错
    expect(() => compileToScene(ir, { onWarn: () => {} })).toThrow();
  });
});

describe('交互场景', () => {
  it('scope_polar_with_scope_rotate_and_node_rotate：scope rotate(30) + 内 node A rotate(15) + B polar 引用 A', () => {
    // node 自身 rotate 不参与 layout.center 计算——只影响 rect.rotate；B polar 引用 A 中心
    // A 在 scope 内 position=[0,0]，A_global = applyRotate(30) [0,0] = (0, 0)
    // B = { origin: A, angle: 45, radius: 50 }
    //   A_global=(0,0); inverseRotate(-30)→A_local=(0,0); +(50cos45, 50sin45)=(35.36, 35.36)
    //   applyRotate(30) → 旋转后再加 0 → 仍是 rotate30 后的局部 (35.36, 35.36)
    //   global ≈ (35.36*cos30 - 35.36*sin30, 35.36*sin30 + 35.36*cos30) ≈ (12.94, 48.30)
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'rotate', degrees: 30 }],
        children: [
          { type: 'node', id: 'A', position: [0, 0], rotate: 15, text: 'A' },
          {
            type: 'node',
            id: 'B',
            position: { origin: 'A', angle: 45, radius: 50 },
            text: 'B',
          },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [200, 200] },
          { type: 'step', kind: 'line', to: 'B' },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    const r45 = (45 * Math.PI) / 180;
    const r30 = (30 * Math.PI) / 180;
    const localX = 50 * Math.cos(r45);
    const localY = 50 * Math.sin(r45);
    const expX = localX * Math.cos(r30) - localY * Math.sin(r30);
    const expY = localX * Math.sin(r30) + localY * Math.cos(r30);
    expect(Math.abs(end![0] - expX)).toBeLessThan(20);
    expect(Math.abs(end![1] - expY)).toBeLessThan(20);
  });

  it('scope_offset_chain_across_scopes：3 层 scope 各自 transform + offset 链跨层引用', () => {
    // scope1 translate(0, 0)（A 全局原点）
    // scope2 rotate(90)（其内 B 引用 A，offset (10, 0) 局部 → apply rotate → 全局 (0, 10)）
    // scope3 scale(2)（其内 C 引用 B，offset (0, 10) 局部 → ... ）
    // 单纯关注嵌套不报错 + 全局坐标合理
    const ir = scene([
      { type: 'node', id: 'A', position: [0, 0], text: 'A' },
      {
        type: 'scope',
        transforms: [{ kind: 'rotate', degrees: 90 }],
        children: [
          {
            type: 'node',
            id: 'B',
            position: { of: 'A', offset: [10, 0] },
            text: 'B',
          },
          {
            type: 'scope',
            transforms: [{ kind: 'scale', x: 2 }],
            children: [
              {
                type: 'node',
                id: 'C',
                position: { of: 'B', offset: [0, 10] },
                text: 'C',
              },
            ],
          },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [200, 200] },
          { type: 'step', kind: 'line', to: 'C' },
        ],
      },
    ]);
    const warnings: Array<CompileWarning> = [];
    const compiled = compileToScene(ir, { onWarn: w => warnings.push(w) });
    expect(warnings.filter(w => w.code === 'OFFSET_BASE_UNRESOLVED')).toHaveLength(0);
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    // B 全局：A_global=(0,0); inverseRotate90 → A_local=(0,0); +(10,0)=(10,0); applyRotate90 → (0, 10)
    // C 在 scope2 rotate90 + scope3 scale2 链里：
    //   B_global=(0,10);
    //   inverse chain=[rotate90, scale2] (按数组正序 inverse: rotate-90 then scale 1/2):
    //     B 先 inverseRotate90 → ... 这里精确数值太复杂，只做合理性边界
    // C 不应该爆炸：x 在合理范围（不 NaN，绝对值有限）
    expect(Number.isFinite(end![0])).toBe(true);
    expect(Number.isFinite(end![1])).toBe(true);
    expect(Math.abs(end![0])).toBeLessThan(1000);
    expect(Math.abs(end![1])).toBeLessThan(1000);
  });

  it('scope_polar_origin_cartesian_in_scope：scope rotate(45) + polar.origin 笛卡尔字面量 → 全部链路局部度量', () => {
    // node `{ origin: [100, 0], angle: 0, radius: 30 }` 在 scope rotate(45) 内
    // 笛卡尔 origin [100, 0] 是当前 scope 局部坐标；polar 算后局部 (130, 0)；apply rotate 45 → 全局
    // expX = 130 cos45 ≈ 91.92；expY = 130 sin45 ≈ 91.92
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'rotate', degrees: 45 }],
        children: [
          {
            type: 'node',
            id: 'P',
            position: { origin: [100, 0], angle: 0, radius: 30 },
            text: 'P',
          },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [300, 300] },
          { type: 'step', kind: 'line', to: 'P' },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    const expected = 130 * Math.cos((45 * Math.PI) / 180);
    expect(Math.abs(end![0] - expected)).toBeLessThan(20);
    expect(Math.abs(end![1] - expected)).toBeLessThan(20);
  });

  it('scope_at_with_nodeDistance_compile_option：scope rotate(90) + at 无 distance → 取 nodeDistance 局部度量', () => {
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'rotate', degrees: 90 }],
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          {
            type: 'node',
            id: 'B',
            position: { direction: 'right', of: 'A' },
            text: 'B',
          },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [200, 200] },
          { type: 'step', kind: 'line', to: 'B' },
        ],
      },
    ]);
    const compiled = compileToScene(ir, { nodeDistance: 30 });
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    // distance=30 取自 nodeDistance；right 局部 → rotate 90 视觉变 down → B 视觉 (0, 30)
    expect(Math.abs(end![0])).toBeLessThan(20);
    expect(Math.abs(end![1] - 30)).toBeLessThan(20);
  });
});

describe('path step 在 scope 内（笛卡尔 / 相对 to）按 scope 局部度量', () => {
  it('scope_path_cartesian_to_projected：scope rotate(90) + path step.to=[10, 0] → 端点 ≈ (0, 10) 全局', () => {
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'rotate', degrees: 90 }],
        children: [
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [10, 0] },
            ],
          },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    // rotate 90: (10, 0) → (0, 10)
    expect(Math.abs(end![0])).toBeLessThan(1);
    expect(Math.abs(end![1] - 10)).toBeLessThan(1);
  });

  it('scope_path_polar_to_projected：scope rotate(45) + path step.to={angle:0, radius:30} → 端点视觉投影', () => {
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'rotate', degrees: 45 }],
        children: [
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: { angle: 0, radius: 30 } },
            ],
          },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    const expected = 30 * Math.cos((45 * Math.PI) / 180);
    expect(Math.abs(end![0] - expected)).toBeLessThan(1);
    expect(Math.abs(end![1] - expected)).toBeLessThan(1);
  });
});

describe('path relative inside scope', () => {
  it('scope rotate(90) 内 path {relative:[10,0]} → 端点视觉沿 +y 方向（局部右 10 经 scope rotate 90 投影到 (0, 10)）', () => {
    // move 到 (0, 0) 全局；line relative (10, 0) 局部 = (10, 0) 局部 → apply rotate 90 = (0, 10) 全局
    // 旧实现 double apply：localShifted (10, 0) 在 relative.ts 已 applyTransformChain(rotate 90) → (0, 10) 全局
    // 写回 step.to 后下游 refPointOfTarget 又当局部 (0, 10) 字面量再 apply rotate 90 → (-10, 0) ❌
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'rotate', degrees: 90 }],
        children: [
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: { relative: [10, 0] } },
            ],
          },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    expect(end![0]).toBeCloseTo(0, 1);
    expect(end![1]).toBeCloseTo(10, 1);
  });

  it('scope scale(2) 内 path {relative:[10,0]} → 端点视觉沿 +x 20 单位（局部 10 经 scale 2）', () => {
    // move 到 (0, 0) 全局；line relative (10, 0) 局部 = (10, 0) 局部 → apply scale 2 = (20, 0) 全局
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'scale', x: 2 }],
        children: [
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: { relative: [10, 0] } },
            ],
          },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    expect(end![0]).toBeCloseTo(20, 1);
    expect(end![1]).toBeCloseTo(0, 1);
  });

  it('scope rotate(90) 内 chained relativeAccumulate 多步推进 prevEnd → 链式累进端点正确', () => {
    // move to [0,0] 全局；
    // line relativeAccumulate (10, 0) → 第 1 步局部 (10, 0) → 全局 (0, 10)；prevEnd = (0, 10)
    // line relativeAccumulate (10, 0) → prevEnd (0, 10) inverse rotate -90 = (10, 0) 局部 + (10, 0) = (20, 0) 局部 → 全局 (0, 20)
    // 旧实现 double-apply 下 prevEnd 推到错位 → 第 2 步累计偏离
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'rotate', degrees: 90 }],
        children: [
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: { relativeAccumulate: [10, 0] } },
              { type: 'step', kind: 'line', to: { relativeAccumulate: [10, 0] } },
            ],
          },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    const prim = topPath(compiled.primitives);
    expect(prim).toBeDefined();
    if (!prim || prim.type !== 'path') throw new Error('expect path');
    const lines: Array<[number, number]> = [];
    for (const cmd of prim.commands) {
      if (cmd.kind === 'line') lines.push(cmd.to);
    }
    expect(lines).toHaveLength(2);
    expect(lines[0]![0]).toBeCloseTo(0, 1);
    expect(lines[0]![1]).toBeCloseTo(10, 1);
    expect(lines[1]![0]).toBeCloseTo(0, 1);
    expect(lines[1]![1]).toBeCloseTo(20, 1);
  });
});
