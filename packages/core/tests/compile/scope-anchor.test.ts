/**
 * 跨 scope anchor / 数字角度 / corner + scope scale 集成测试
 * @description scope transform chain 累积到 NodeLayout.rect.rotate / .width / .height 后；
 *   path target `'A.<keyword>'` / `'A.<deg>'` 取 anchor 应反映视觉投影；测试用 fallback measurer 几何近似 + 宽松断言
 */
import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { IR, ScenePrimitive } from '../../src';
import { flattenPrims } from '../helpers/flatten';

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

describe('跨 scope anchor keyword', () => {
  it('scope_anchor_north_cross：scope translate(100,0) + path A.north 投影到全局 (100, A.north.y)', () => {
    const ir = scene([
      { type: 'node', id: 'ext', position: [0, 0], text: 'E' },
      {
        type: 'scope',
        transforms: [{ kind: 'translate', x: 100, y: 0 }],
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: 'ext' },
          { type: 'step', kind: 'line', to: 'A.north' },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    // A.north 全局 x ≈ 100；y 应小于 0（north = -y 方向）
    expect(Math.abs(end![0] - 100)).toBeLessThan(20);
    expect(end![1]).toBeLessThan(0);
  });

  it('scope_anchor_corner_cross_scale：scope scale(2) + path A.east → east 点按 scale 拉伸', () => {
    // 无 scale 对照
    const irBase = scene([
      { type: 'node', id: 'ext', position: [0, 60], text: 'E' },
      {
        type: 'scope',
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: 'ext' },
          { type: 'step', kind: 'line', to: 'A.east' },
        ],
      },
    ]);
    const irScale = scene([
      { type: 'node', id: 'ext', position: [0, 60], text: 'E' },
      {
        type: 'scope',
        transforms: [{ kind: 'scale', x: 2 }],
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: 'ext' },
          { type: 'step', kind: 'line', to: 'A.east' },
        ],
      },
    ]);
    const eBase = lineTo(topPath(compileToScene(irBase).primitives));
    const eScale = lineTo(topPath(compileToScene(irScale).primitives));
    expect(eBase).toBeDefined();
    expect(eScale).toBeDefined();
    // scale=2 时 east 在 x 方向应大于无 scale 版本
    expect(eScale![0]).toBeGreaterThan(eBase![0]);
  });
});

describe('跨 scope 数字角度', () => {
  it('scope_anchor_numeric_cross：scope rotate(45) + path A.0 端点反映视觉 (累积 rotate 后)', () => {
    // 无 rotate
    const irBase = scene([
      { type: 'node', id: 'ext', position: [-50, 0], text: 'E' },
      {
        type: 'scope',
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: 'ext' },
          { type: 'step', kind: 'line', to: 'A.0' },
        ],
      },
    ]);
    const irRot = scene([
      { type: 'node', id: 'ext', position: [-50, 0], text: 'E' },
      {
        type: 'scope',
        transforms: [{ kind: 'rotate', degrees: 45 }],
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: 'ext' },
          { type: 'step', kind: 'line', to: 'A.0' },
        ],
      },
    ]);
    const eBase = lineTo(topPath(compileToScene(irBase).primitives));
    const eRot = lineTo(topPath(compileToScene(irRot).primitives));
    expect(eBase).toBeDefined();
    expect(eRot).toBeDefined();
    // 无 rotate：A.0 局部 +x 方向；rotate 45 度 → 视觉方向 (+x, +y) 各 cos/sin 45°——y 应明显 > 0
    expect(Math.abs(eBase![1])).toBeLessThan(2); // 无 rotate y ≈ 0
    expect(eRot![1]).toBeGreaterThan(0); // rotate 45 后 y > 0
  });
});

describe('scope.id synthetic bbox 注册到父 frame，外部可 lookup', () => {
  it('scope.id 注册后 outer path 引用 scope.id 不触发 UNRESOLVED warn，端点落在 bbox 中心', () => {
    const ir = scene([
      {
        type: 'scope',
        id: 'cluster',
        transforms: [{ kind: 'translate', x: 60, y: 0 }],
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 60] },
          { type: 'step', kind: 'line', to: 'cluster' },
        ],
      },
    ]);
    const warnings: Array<{ code: string }> = [];
    const compiled = compileToScene(ir, { onWarn: w => warnings.push(w) });
    expect(warnings.filter(w => w.code === 'UNRESOLVED_NODE_REFERENCE')).toHaveLength(0);
    // bbox 中心 ≈ A 的全局中心 (60, 0)（A 是唯一子 node，bbox = A 的 4 角 AABB，中心即 A 中心）
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    expect(Math.abs(end![0] - 60)).toBeLessThan(20);
  });
});

describe('跨 scope 位置引用（polar.origin / AtPosition.of / OffsetPosition.of）', () => {
  it('scope_polar_origin_cross_scope：scope 内 node 用 polar.origin 引用外层 node，referent 取全局 / relative 在 scope 局部度量', () => {
    const ir = scene([
      { type: 'node', id: 'hub', position: [0, 0], text: 'H' },
      {
        type: 'scope',
        transforms: [{ kind: 'translate', x: 100, y: 0 }],
        children: [
          {
            type: 'node',
            id: 'orbit',
            position: { origin: 'hub', angle: 0, radius: 30 },
            text: 'O',
          },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 60] },
          { type: 'step', kind: 'line', to: 'orbit' },
        ],
      },
    ]);
    const warnings: Array<{ code: string }> = [];
    const compiled = compileToScene(ir, { onWarn: w => warnings.push(w) });
    // referent hub_global=(0,0); inverseTranslate(100,0) → 局部 (-100,0); +(30,0) → 局部 (-70,0); applyTranslate(100,0) → 全局 (30,0)
    // 几何上：scope translate 不改 relative 矢量方向 / 长度——orbit 视觉在 hub 全局右 30
    expect(warnings.filter(w => w.code === 'POLAR_ORIGIN_UNRESOLVED')).toHaveLength(0);
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    expect(Math.abs(end![0] - 30)).toBeLessThan(20);
  });

  it('scope_at_of_cross_scope：scope 内 node 用 AtPosition.of 引用外层 node，referent 取全局 / relative 在 scope 局部度量', () => {
    const ir = scene([
      { type: 'node', id: 'hub', position: [0, 0], text: 'H' },
      {
        type: 'scope',
        transforms: [{ kind: 'translate', x: 100, y: 0 }],
        children: [
          {
            type: 'node',
            id: 'follower',
            position: { direction: 'right', of: 'hub', distance: 40 },
            text: 'F',
          },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 60] },
          { type: 'step', kind: 'line', to: 'follower' },
        ],
      },
    ]);
    const warnings: Array<{ code: string }> = [];
    const compiled = compileToScene(ir, { onWarn: w => warnings.push(w) });
    expect(warnings.filter(w => w.code === 'AT_TARGET_UNRESOLVED')).toHaveLength(0);
    // hub_global=(0,0)；scope translate 不改 right 方向 / 距离 → 视觉 = hub 全局右 40 = 全局 (40, 0)
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    expect(Math.abs(end![0] - 40)).toBeLessThan(20);
  });

  it('scope_offset_of_cross_scope：scope 内 node 用 OffsetPosition.of 引用外层 node，referent 取全局 / relative 在 scope 局部度量', () => {
    const ir = scene([
      { type: 'node', id: 'hub', position: [0, 0], text: 'H' },
      {
        type: 'scope',
        transforms: [{ kind: 'translate', x: 100, y: 0 }],
        children: [
          {
            type: 'node',
            id: 'shifted',
            position: { of: 'hub', offset: [20, 10] },
            text: 'S',
          },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 60] },
          { type: 'step', kind: 'line', to: 'shifted' },
        ],
      },
    ]);
    const warnings: Array<{ code: string }> = [];
    const compiled = compileToScene(ir, { onWarn: w => warnings.push(w) });
    expect(warnings.filter(w => w.code === 'OFFSET_BASE_UNRESOLVED')).toHaveLength(0);
    // hub_global=(0,0) + offset(20,10) 经 scope translate 后视觉 = hub 全局 +(20,10) = (20, 10)
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    expect(Math.abs(end![0] - 20)).toBeLessThan(20);
  });
});

describe('跨 scope anchor 边界', () => {
  it('scope_anchor_zero_size_node：scope 内 0×0 节点（无 text + minimumSize 0）anchor 仍能解析到中心', () => {
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'translate', x: 80, y: 0 }],
        children: [
          { type: 'coordinate', id: 'cz', position: [0, 0] },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 60] },
          { type: 'step', kind: 'line', to: 'cz.north' },
        ],
      },
    ]);
    const warnings: Array<{ code: string }> = [];
    const compiled = compileToScene(ir, { onWarn: w => warnings.push(w) });
    expect(warnings.filter(w => w.code === 'UNRESOLVED_NODE_REFERENCE')).toHaveLength(0);
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    // 0×0 → north == 中心 == (80, 0)
    expect(Math.abs(end![0] - 80)).toBeLessThan(5);
    expect(Math.abs(end![1] - 0)).toBeLessThan(5);
  });

  it('scope_anchor_at_origin_of_scope：scope translate(0, 0) 等价无 transform——anchor 结果与无 scope 一致', () => {
    const irNoScope = scene([
      { type: 'node', id: 'A', position: [0, 0], text: 'A' },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [-50, 0] },
          { type: 'step', kind: 'line', to: 'A.north' },
        ],
      },
    ]);
    const irZeroScope = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'translate', x: 0, y: 0 }],
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [-50, 0] },
          { type: 'step', kind: 'line', to: 'A.north' },
        ],
      },
    ]);
    const eFlat = lineTo(topPath(compileToScene(irNoScope).primitives));
    const eScope = lineTo(topPath(compileToScene(irZeroScope).primitives));
    expect(eFlat).toBeDefined();
    expect(eScope).toBeDefined();
    expect(Math.abs(eFlat![0] - eScope![0])).toBeLessThan(0.01);
    expect(Math.abs(eFlat![1] - eScope![1])).toBeLessThan(0.01);
  });

  it('scope_deep_nested_anchor：5 层嵌套 scope 累积 translate(20,0) ×5 → A.north 全局 x ≈ 100', () => {
    // 构造 5 层嵌套，每层 translate(20, 0)；最内层有 node id='A'
    const inner: IR['children'][number] = { type: 'node', id: 'A', position: [0, 0], text: 'A' };
    let acc: IR['children'][number] = inner;
    for (let i = 0; i < 5; i++) {
      acc = {
        type: 'scope',
        transforms: [{ kind: 'translate', x: 20, y: 0 }],
        children: [acc],
      };
    }
    const ir = scene([
      acc,
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 60] },
          { type: 'step', kind: 'line', to: 'A.north' },
        ],
      },
    ]);
    const warnings: Array<{ code: string }> = [];
    const compiled = compileToScene(ir, { onWarn: w => warnings.push(w) });
    expect(warnings.filter(w => w.code === 'UNRESOLVED_NODE_REFERENCE')).toHaveLength(0);
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    // 全局 x ≈ 100（5 × 20）；y < 0 (north 方向)
    expect(Math.abs(end![0] - 100)).toBeLessThan(20);
    expect(end![1]).toBeLessThan(0);
  });
});

describe('跨 scope anchor 错误路径', () => {
  it('scope_anchor_reference_unknown_id：path 引用未定义 id 的 anchor → UNRESOLVED_NODE_REFERENCE warn', () => {
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'translate', x: 60, y: 0 }],
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 60] },
          { type: 'step', kind: 'line', to: 'ghost.north' },
        ],
      },
    ]);
    const warnings: Array<{ code: string }> = [];
    compileToScene(ir, { onWarn: w => warnings.push(w) });
    expect(warnings.some(w => w.code === 'UNRESOLVED_NODE_REFERENCE')).toBe(true);
  });

  it('scope_anchor_invalid_anchor_name：path 引用合法 id 但 anchor 名不在 RECT_ANCHORS → parseNodeRef 抛错', () => {
    const ir = scene([
      {
        type: 'scope',
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'line', to: 'A.invalid' },
        ],
      },
    ]);
    // 当前实现：parseNodeRef 对未知 anchor 直接抛错（避免静默吞拼写错误）；
    // 这里断言抛错语义——后续如改为 ANCHOR_RESOLUTION_FAILED warn 路线，更新此 case 即可
    expect(() => compileToScene(ir)).toThrow(/unknown anchor/);
  });
});

describe('跨 scope anchor 交互场景', () => {
  it('scope_with_rotate_node_inside_anchor：scope rotate(30) + node rotate(15) + anchor `.45` → 两层 rotate 叠加进 layout.rotate，端点 y 显著偏移', () => {
    const irBase = scene([
      {
        type: 'scope',
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [-50, 0] },
          { type: 'step', kind: 'line', to: 'A.45' },
        ],
      },
    ]);
    const irRot = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'rotate', degrees: 30 }],
        children: [{ type: 'node', id: 'A', position: [0, 0], rotate: 15, text: 'A' }],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [-50, 0] },
          { type: 'step', kind: 'line', to: 'A.45' },
        ],
      },
    ]);
    const eBase = lineTo(topPath(compileToScene(irBase).primitives));
    const eRot = lineTo(topPath(compileToScene(irRot).primitives));
    expect(eBase).toBeDefined();
    expect(eRot).toBeDefined();
    // 无 rotate：A.45 在 +x +y 局部方向；scope 30 + node 15 = 45 度额外旋转 → 视觉端点位置应明显不同
    const dx = Math.abs(eRot![0] - eBase![0]);
    const dy = Math.abs(eRot![1] - eBase![1]);
    expect(dx + dy).toBeGreaterThan(2);
  });

  it('scope_with_at_position_and_anchor_chain：node B AtPosition `{ of: A, direction: right }` 在 scope 内 + path 引用 `B.south` → 全链路解析', () => {
    // A 在 scope 外，B 在 scope 内引用 A——relative 部分在 scope 局部度量后投回全局
    const ir = scene([
      { type: 'node', id: 'A', position: [0, 0], text: 'A' },
      {
        type: 'scope',
        transforms: [{ kind: 'translate', x: 0, y: 80 }],
        children: [
          {
            type: 'node',
            id: 'B',
            position: { direction: 'right', of: 'A', distance: 60 },
            text: 'B',
          },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 200] },
          { type: 'step', kind: 'line', to: 'B.south' },
        ],
      },
    ]);
    const warnings: Array<{ code: string }> = [];
    const compiled = compileToScene(ir, { onWarn: w => warnings.push(w) });
    expect(warnings.filter(w => w.code === 'UNRESOLVED_NODE_REFERENCE')).toHaveLength(0);
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    // A 全局 (0, 0)；scope translate 不改 right 方向 / 距离；B 视觉 = A 全局右 60 = (60, 0)；south 在 y > 0 方向
    expect(Math.abs(end![0] - 60)).toBeLessThan(20);
    expect(end![1]).toBeGreaterThan(0);
  });

  it('scope_with_polar_chain_cross_scope：A 在 scope1、B polar.origin=A 在 scope2 不同 transform → 全链解析', () => {
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'translate', x: 40, y: 0 }],
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
      {
        type: 'scope',
        transforms: [{ kind: 'translate', x: 0, y: 40 }],
        children: [
          {
            type: 'node',
            id: 'B',
            position: { origin: 'A', angle: 0, radius: 30 },
            text: 'B',
          },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 100] },
          { type: 'step', kind: 'line', to: 'B' },
        ],
      },
    ]);
    const warnings: Array<{ code: string }> = [];
    const compiled = compileToScene(ir, { onWarn: w => warnings.push(w) });
    expect(warnings.filter(w => w.code === 'POLAR_ORIGIN_UNRESOLVED')).toHaveLength(0);
    // A 全局 (40, 0)；scope2 translate 不改 relative 矢量方向 / 长度；
    // B 视觉 = A 全局 + (30, 0) = (70, 0)（不再 + scope2 的 y=40 偏移——translate 不重复 apply 到 relative）
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    expect(Math.abs(end![0] - 70)).toBeLessThan(20);
    expect(Math.abs(end![1])).toBeLessThan(20);
  });

  it('scope_emit_group_prim_anchor_global：Scene GroupPrim 子 node 在局部坐标；NameStack layout 全局——path 端点取后者，二者一致无 drift', () => {
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'translate', x: 120, y: 0 }],
        children: [{ type: 'node', id: 'A', position: [10, 0], text: 'A' }],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 80] },
          { type: 'step', kind: 'line', to: 'A.center' },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    // 顶层 GroupPrim 含 transforms translate(120, 0)；其 children 中 A 的 rect.x = 10（局部坐标）
    const group = compiled.primitives.find(p => p.type === 'group');
    expect(group).toBeDefined();
    expect(group!.transforms).toEqual([{ kind: 'translate', x: 120, y: 0 }]);
    const innerRect = flattenPrims(group!.children).find(p => p.type === 'rect');
    expect(innerRect).toBeDefined();
    // 局部坐标 rect 左上角 = 10 - halfW < 10；x 应接近 10 - halfW，而不是 130 - halfW
    expect(innerRect!.x).toBeLessThan(40);
    // path 端点采用 NameStack 中 A 的全局坐标 (130, 0) 算 anchor.center
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    expect(Math.abs(end![0] - 130)).toBeLessThan(20);
  });
});
