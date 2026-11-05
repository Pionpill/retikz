import { describe, expect, it } from 'vitest';

import {
  NodeLabelDefaultSchema,
  NodeDefaultSchema,
  PathDefaultSchema,
  ScopePropsSchema,
  ScopeSchema,
} from '../../src/schemas';

describe('ScopePropsSchema 可复用 Scope authored fragment', () => {
  it('接受完整 authored Scope props，但不接受 type / children', () => {
    expect(
      ScopePropsSchema.safeParse({
        theme: { mode: 'dark' },
        id: 'wrapper',
        localNamespace: true,
        transforms: [{ kind: 'translate', x: 10, y: 20 }],
        position: { kind: 'anchor', target: [30, 40], selfAnchor: 'center' },
        zIndex: 2,
        clip: { kind: 'rect', params: { x: 0, y: 0, width: 20, height: 10 } },
        boundingShape: 'circle',
        meta: { role: 'wrapper' },
        animations: [],
        defaults: {
          style: { fill: 'lightblue', opacity: 0.8 },
          node: {
            shape: 'circle',
            style: { fill: 'white' },
          },
          reset: ['path'],
        },
      }).success,
    ).toBe(true);
    expect(ScopePropsSchema.safeParse({ type: 'scope' }).success).toBe(false);
    expect(ScopePropsSchema.safeParse({ children: [] }).success).toBe(false);
  });

  it('与完整 Scope 共享字段校验并保持 JSON round-trip', () => {
    const props = {
      transforms: [{ kind: 'scale' as const, x: 1.5, pivot: [2, 3] as [number, number] }],
      position: { kind: 'anchor', target: [10, 20] as [number, number] },
      defaults: { style: { fill: 'lightblue' }, reset: ['node', 'path'], node: { style: { fill: 'white' } } },
    };
    const parsed = ScopePropsSchema.parse(JSON.parse(JSON.stringify(props)));

    expect(parsed).toEqual(props);
    expect(ScopeSchema.parse({ type: 'scope', ...parsed, children: [] })).toEqual({
      type: 'scope',
      ...props,
      children: [],
    });
  });

  it('拒绝未知字段和非 JSON authored props', () => {
    expect(ScopePropsSchema.safeParse({ unknown: true }).success).toBe(false);
    expect(ScopePropsSchema.safeParse({ meta: { value: undefined } }).success).toBe(false);
  });
});

describe('NodeDefaultSchema（every node 默认）', () => {
  it('接受 node 样式字段子集', () => {
    expect(
      NodeDefaultSchema.safeParse({
        shape: 'circle',
        style: { fill: 'lightblue' },
      }).success,
    ).toBe(true);
  });

  it('接受空对象（defaults.node={{}} 无效果但合法）', () => {
    expect(NodeDefaultSchema.safeParse({}).success).toBe(true);
  });

  it('接受 color 主色字段', () => {
    expect(
      NodeDefaultSchema.safeParse({
        style: { color: 'red' },
      }).success,
    ).toBe(true);
  });

  it('接受数值派生 paint 与文字色，但拒绝数值主色', () => {
    expect(
      NodeDefaultSchema.safeParse({
        style: { fill: 0.08, stroke: 1, textColor: 0.7 },
      }).success,
    ).toBe(true);
    expect(
      NodeDefaultSchema.safeParse({
        style: { color: 0.5 },
      }).success,
    ).toBe(false);
  });

  it('接受嵌套 font 字段', () => {
    expect(
      NodeDefaultSchema.safeParse({
        style: { font: { size: 12, family: 'serif' } },
      }).success,
    ).toBe(true);
  });

  it('拒被排除字段 position（strict）', () => {
    expect(NodeDefaultSchema.safeParse({ position: [0, 0] }).success).toBe(false);
  });

  it('拒绝实例身份和正文，但允许配置已有标签', () => {
    for (const value of [{ id: 'A' }, { text: 'x' }, { type: 'node' }, { label: { text: 'x' } }]) {
      expect(NodeDefaultSchema.safeParse(value).success).toBe(false);
    }
    const defaults = { label: { font: { size: 12 }, textColor: 'red' } };
    expect(NodeDefaultSchema.parse(defaults)).toEqual(defaults);
  });

  it('拒未知字段（strict）', () => {
    expect(NodeDefaultSchema.safeParse({ nope: 1 }).success).toBe(false);
  });
});

describe('PathDefaultSchema（every path 默认）', () => {
  it('接受完整 path 默认原子字段集合（不含 children）', () => {
    expect(
      PathDefaultSchema.safeParse({
        cornerRadius: 3,
        rotate: 30,
        scale: { x: 1.5, y: 2 },
        style: {
          color: 'crimson',
          fill: '#fee2e2',
          stroke: 'red',
          strokeWidth: 2,
          shadow: 'sm',
          blendMode: 'multiply',
          dashPattern: [4, 2],
          dashOffset: -1,
          lineCap: 'round',
          lineJoin: 'bevel',
          fillRule: 'evenodd',
          opacity: { fill: 0.4, stroke: 0.7, overall: 0.8 },
        },
      }).success,
    ).toBe(true);
  });

  it('接受 color 主色字段', () => {
    expect(
      PathDefaultSchema.safeParse({
        style: { color: 'crimson' },
      }).success,
    ).toBe(true);
  });

  it('接受数值派生 fill / stroke，但拒绝数值主色', () => {
    expect(
      PathDefaultSchema.safeParse({
        style: { fill: 0.1, stroke: 0.9 },
      }).success,
    ).toBe(true);
    expect(
      PathDefaultSchema.safeParse({
        style: { color: 0.5 },
      }).success,
    ).toBe(false);
  });

  it('保留对象箭头默认值并拒绝字符串方向糖', () => {
    const defaults = { arrow: { shape: 'stealth', end: { scale: 2 } } };
    expect(PathDefaultSchema.parse(defaults)).toEqual(defaults);
    expect(PathDefaultSchema.safeParse({ arrow: '->' }).success).toBe(false);
  });

  it('拒被排除字段 arrowDetail', () => {
    expect(PathDefaultSchema.safeParse({ arrowDetail: { shape: 'stealth' } }).success).toBe(false);
  });

  it('拒被排除字段 children / type', () => {
    expect(PathDefaultSchema.safeParse({ children: [] }).success).toBe(false);
    expect(PathDefaultSchema.safeParse({ type: 'path' }).success).toBe(false);
  });

  it('拒绝实例身份、结构与创建标签或标记的字段', () => {
    for (const value of [
      { id: 'path' },
      { zIndex: 1 },
      { meta: { source: 'scope' } },
      { animations: [] },
      { kind: 'stroke' },
      { kindOptions: {} },
      { unknownPathField: { width: 1 } },
      { label: { text: 'edge' } },
      { marks: [] },
    ]) {
      expect(PathDefaultSchema.safeParse(value).success).toBe(false);
    }
  });

  it('拒未知字段（strict）', () => {
    expect(PathDefaultSchema.safeParse({ nope: 1 }).success).toBe(false);
  });
});

describe('NodeLabelDefaultSchema（every label 默认）', () => {
  it('接受 color / textColor / opacity / font', () => {
    expect(
      NodeLabelDefaultSchema.safeParse({
        color: 'red',
        textColor: 'gray',
        opacity: 0.6,
        font: { size: 10 },
      }).success,
    ).toBe(true);
  });

  it('接受空对象', () => {
    expect(NodeLabelDefaultSchema.safeParse({}).success).toBe(true);
  });

  it('接受数值派生 textColor，但拒绝数值 label master', () => {
    expect(NodeLabelDefaultSchema.safeParse({ textColor: 0.6 }).success).toBe(true);
    expect(NodeLabelDefaultSchema.safeParse({ color: 0.6 }).success).toBe(false);
  });

  it('拒未知字段（strict）', () => {
    expect(NodeLabelDefaultSchema.safeParse({ nope: 1 }).success).toBe(false);
  });

  it('opacity 越界拒', () => {
    expect(NodeLabelDefaultSchema.safeParse({ opacity: 1.5 }).success).toBe(false);
    expect(NodeLabelDefaultSchema.safeParse({ opacity: -0.1 }).success).toBe(false);
  });
});

describe('ScopeSchema 级联 graphic state', () => {
  it('接受 color 主色', () => {
    expect(
      ScopeSchema.safeParse({
        type: 'scope',
        children: [],
        defaults: { style: { color: 'blue' } },
      }).success,
    ).toBe(true);
  });

  it('接受全部级联分项', () => {
    expect(
      ScopeSchema.safeParse({
        type: 'scope',
        children: [],
        defaults: {
          style: {
            color: 'blue',
            stroke: 'red',
            fill: 'yellow',
            strokeWidth: 2,
            opacity: { overall: 0.5, fill: 0.4, stroke: 0.3 },
          },
        },
      }).success,
    ).toBe(true);
  });

  it('接受数值派生级联 paint，并保持 Scope color string-only', () => {
    expect(
      ScopeSchema.safeParse({
        type: 'scope',
        children: [],
        defaults: { style: { fill: 0.08, stroke: 1 } },
      }).success,
    ).toBe(true);
    expect(
      ScopeSchema.safeParse({
        type: 'scope',
        children: [],
        defaults: { style: { color: 0.4 } },
      }).success,
    ).toBe(false);
  });

  it('级联 opacity 越界拒', () => {
    expect(
      ScopeSchema.safeParse({
        type: 'scope',
        children: [],
        defaults: { style: { opacity: 1.5 } },
      }).success,
    ).toBe(false);
  });
});

describe('ScopeSchema 节点与路径默认通道', () => {
  it('接受 defaults.node / defaults.path / label / arrow', () => {
    expect(
      ScopeSchema.safeParse({
        type: 'scope',
        children: [],
        defaults: {
          node: { shape: 'circle', style: { fill: 'lightblue' }, label: { font: { size: 10 } } },
          path: { style: { stroke: 'green' }, label: { font: { size: 10 } }, arrow: { shape: 'stealth', scale: 1.5 } },
        },
      }).success,
    ).toBe(true);
  });

  it('defaults.node 含被排除字段（position）拒', () => {
    expect(
      ScopeSchema.safeParse({
        type: 'scope',
        children: [],
        defaults: { node: { position: [0, 0] } },
      }).success,
    ).toBe(false);
  });
});

describe('ScopeSchema defaults.reset 屏障', () => {
  it('接受 defaults.reset: true', () => {
    expect(
      ScopeSchema.safeParse({
        type: 'scope',
        children: [],
        defaults: { reset: true },
      }).success,
    ).toBe(true);
  });

  it('接受 defaults.reset 通道数组', () => {
    expect(
      ScopeSchema.safeParse({
        type: 'scope',
        children: [],
        defaults: { reset: ['node', 'path'] },
      }).success,
    ).toBe(true);
  });

  it('defaults.reset 含非法通道拒', () => {
    expect(
      ScopeSchema.safeParse({
        type: 'scope',
        children: [],
        defaults: { reset: ['nope'] },
      }).success,
    ).toBe(false);
  });

  it('defaults.reset 为数字拒', () => {
    expect(
      ScopeSchema.safeParse({
        type: 'scope',
        children: [],
        defaults: { reset: 1 },
      }).success,
    ).toBe(false);
  });
});

describe('Scope 样式 JSON round-trip', () => {
  it('级联 + 节点与路径默认通道 + defaults.reset scope 序列化往返语义等价', () => {
    const ir = {
      type: 'scope' as const,
      children: [
        {
          type: 'node' as const,
          position: [0, 0] as [number, number],
          style: { color: 'red' },
        },
      ],
      defaults: {
        style: { color: 'blue', strokeWidth: 2 },
        reset: ['node', 'path'],
        node: { shape: 'circle' as const, style: { fill: 'lightblue' }, label: { font: { size: 10 } } },
        path: {
          style: { stroke: 'green' },
          label: { font: { size: 10 } },
          arrow: { shape: 'stealth' as const, scale: 1.5 },
        },
      },
    };
    const restored = ScopeSchema.parse(JSON.parse(JSON.stringify(ir)));

    expect(restored).toEqual({ ...ir, position: [0, 0] });
  });
});
