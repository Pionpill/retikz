/**
 * Scope 样式继承 schema 校验测试（alpha.2 ADR-01）
 * @description 覆盖四通道派生 schema（NodeDefault / PathDefault / LabelDefault / ArrowDefault）的合法形态 +
 *   `.strict()` 拒未知 / 被排除字段；ScopeSchema 级联 graphic state + 四通道 + resetStyle 合法 / 拒；JSON round-trip。
 *   样式继承的运行时解析（主色展开 / 颜色级联 / 优先级链 / resetStyle 屏障）属 compile 行为，见 compile/scope-style-inheritance.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  ArrowDefaultSchema,
  LabelDefaultSchema,
  NodeDefaultSchema,
  PathDefaultSchema,
  ScopeSchema,
} from '../../src/ir';

describe('NodeDefaultSchema（every node 默认）', () => {
  it('接受 node 样式字段子集', () => {
    expect(
      NodeDefaultSchema.safeParse({ shape: 'circle', fill: 'lightblue' }).success,
    ).toBe(true);
  });

  it('接受空对象（nodeDefault={{}} 无效果但合法）', () => {
    expect(NodeDefaultSchema.safeParse({}).success).toBe(true);
  });

  it('接受 color 主色字段', () => {
    expect(NodeDefaultSchema.safeParse({ color: 'red' }).success).toBe(true);
  });

  it('接受嵌套 font 字段', () => {
    expect(
      NodeDefaultSchema.safeParse({ font: { size: 12, family: 'serif' } }).success,
    ).toBe(true);
  });

  it('拒被排除字段 position（strict）', () => {
    expect(NodeDefaultSchema.safeParse({ position: [0, 0] }).success).toBe(false);
  });

  it('拒被排除字段 id / text / label / type', () => {
    expect(NodeDefaultSchema.safeParse({ id: 'A' }).success).toBe(false);
    expect(NodeDefaultSchema.safeParse({ text: 'x' }).success).toBe(false);
    expect(NodeDefaultSchema.safeParse({ label: { text: 'x' } }).success).toBe(false);
    expect(NodeDefaultSchema.safeParse({ type: 'node' }).success).toBe(false);
  });

  it('拒未知字段（strict）', () => {
    expect(NodeDefaultSchema.safeParse({ nope: 1 }).success).toBe(false);
  });
});

describe('PathDefaultSchema（every path 默认）', () => {
  it('接受 path 样式字段子集', () => {
    expect(
      PathDefaultSchema.safeParse({ stroke: 'red', dashPattern: [4, 2] }).success,
    ).toBe(true);
  });

  it('接受 color 主色字段', () => {
    expect(PathDefaultSchema.safeParse({ color: 'crimson' }).success).toBe(true);
  });

  it('拒被排除字段 arrow（走 arrowDefault 通道）', () => {
    expect(PathDefaultSchema.safeParse({ arrow: '->' }).success).toBe(false);
  });

  it('拒被排除字段 arrowDetail', () => {
    expect(
      PathDefaultSchema.safeParse({ arrowDetail: { shape: 'stealth' } }).success,
    ).toBe(false);
  });

  it('拒被排除字段 children / type', () => {
    expect(PathDefaultSchema.safeParse({ children: [] }).success).toBe(false);
    expect(PathDefaultSchema.safeParse({ type: 'path' }).success).toBe(false);
  });

  it('拒未知字段（strict）', () => {
    expect(PathDefaultSchema.safeParse({ nope: 1 }).success).toBe(false);
  });
});

describe('LabelDefaultSchema（every label 默认）', () => {
  it('接受 color / textColor / opacity / font', () => {
    expect(
      LabelDefaultSchema.safeParse({
        color: 'red',
        textColor: 'gray',
        opacity: 0.6,
        font: { size: 10 },
      }).success,
    ).toBe(true);
  });

  it('接受空对象', () => {
    expect(LabelDefaultSchema.safeParse({}).success).toBe(true);
  });

  it('拒未知字段（strict）', () => {
    expect(LabelDefaultSchema.safeParse({ nope: 1 }).success).toBe(false);
  });

  it('opacity 越界拒', () => {
    expect(LabelDefaultSchema.safeParse({ opacity: 1.5 }).success).toBe(false);
    expect(LabelDefaultSchema.safeParse({ opacity: -0.1 }).success).toBe(false);
  });
});

describe('ArrowDefaultSchema（every arrow 默认）', () => {
  it('接受箭头视觉字段', () => {
    expect(
      ArrowDefaultSchema.safeParse({ shape: 'stealth', scale: 1.5 }).success,
    ).toBe(true);
  });

  it('= ArrowDetailSchema：接受 start / end 子对象', () => {
    expect(
      ArrowDefaultSchema.safeParse({
        shape: 'normal',
        end: { shape: 'circle' },
      }).success,
    ).toBe(true);
  });

  it('拒非法 shape', () => {
    expect(ArrowDefaultSchema.safeParse({ shape: 'bogus' }).success).toBe(false);
  });
});

describe('ScopeSchema 级联 graphic state', () => {
  it('接受 color 主色', () => {
    expect(
      ScopeSchema.safeParse({ type: 'scope', color: 'blue', children: [] }).success,
    ).toBe(true);
  });

  it('接受全部级联分项', () => {
    expect(
      ScopeSchema.safeParse({
        type: 'scope',
        color: 'blue',
        stroke: 'red',
        fill: 'yellow',
        strokeWidth: 2,
        opacity: 0.5,
        fillOpacity: 0.4,
        drawOpacity: 0.3,
        children: [],
      }).success,
    ).toBe(true);
  });

  it('级联 opacity 越界拒', () => {
    expect(
      ScopeSchema.safeParse({ type: 'scope', opacity: 1.5, children: [] }).success,
    ).toBe(false);
  });
});

describe('ScopeSchema 四通道 every-X', () => {
  it('接受 nodeDefault / pathDefault / labelDefault / arrowDefault', () => {
    expect(
      ScopeSchema.safeParse({
        type: 'scope',
        nodeDefault: { shape: 'circle', fill: 'lightblue' },
        pathDefault: { stroke: 'green' },
        labelDefault: { font: { size: 10 } },
        arrowDefault: { shape: 'stealth', scale: 1.5 },
        children: [],
      }).success,
    ).toBe(true);
  });

  it('nodeDefault 含被排除字段（position）拒', () => {
    expect(
      ScopeSchema.safeParse({
        type: 'scope',
        nodeDefault: { position: [0, 0] },
        children: [],
      }).success,
    ).toBe(false);
  });

  it('pathDefault 含 arrow 拒', () => {
    expect(
      ScopeSchema.safeParse({
        type: 'scope',
        pathDefault: { arrow: '->' },
        children: [],
      }).success,
    ).toBe(false);
  });
});

describe('ScopeSchema resetStyle 屏障', () => {
  it('接受 resetStyle: true', () => {
    expect(
      ScopeSchema.safeParse({ type: 'scope', resetStyle: true, children: [] }).success,
    ).toBe(true);
  });

  it('接受 resetStyle 通道数组', () => {
    expect(
      ScopeSchema.safeParse({
        type: 'scope',
        resetStyle: ['node', 'path', 'label', 'arrow'],
        children: [],
      }).success,
    ).toBe(true);
  });

  it('resetStyle 含非法通道拒', () => {
    expect(
      ScopeSchema.safeParse({
        type: 'scope',
        resetStyle: ['nope'],
        children: [],
      }).success,
    ).toBe(false);
  });

  it('resetStyle 为数字拒', () => {
    expect(
      ScopeSchema.safeParse({ type: 'scope', resetStyle: 1, children: [] }).success,
    ).toBe(false);
  });
});

describe('Scope 样式 JSON round-trip', () => {
  it('级联 + 四通道 + resetStyle scope 序列化往返语义等价', () => {
    const ir = {
      type: 'scope' as const,
      color: 'blue',
      strokeWidth: 2,
      nodeDefault: { shape: 'circle' as const, fill: 'lightblue' },
      pathDefault: { stroke: 'green' },
      labelDefault: { font: { size: 10 } },
      arrowDefault: { shape: 'stealth' as const, scale: 1.5 },
      resetStyle: ['label' as const],
      children: [{ type: 'node' as const, position: [0, 0] as [number, number], color: 'red' }],
    };
    const restored = ScopeSchema.parse(JSON.parse(JSON.stringify(ir)));
    expect(restored).toEqual(ir);
  });
});

describe('Node / Path 主色 color 字段', () => {
  it('Node 接受 color', async () => {
    const { NodeSchema } = await import('../../src/ir');
    expect(
      NodeSchema.safeParse({ type: 'node', position: [0, 0], color: 'blue' }).success,
    ).toBe(true);
  });

  it('Path 接受 color', async () => {
    const { PathSchema } = await import('../../src/ir');
    expect(
      PathSchema.safeParse({
        type: 'path',
        color: 'crimson',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'line', to: [10, 0] },
        ],
      }).success,
    ).toBe(true);
  });
});
