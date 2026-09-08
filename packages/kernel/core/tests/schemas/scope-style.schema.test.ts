import { describe, expect, it } from 'vitest';

import {
  ArrowDefaultSchema,
  LabelDefaultSchema,
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
        placement: { target: [30, 40], selfAnchor: 'center' },
        zIndex: 2,
        clip: { kind: 'rect', x: 0, y: 0, width: 20, height: 10 },
        boundingShape: 'circle',
        meta: { role: 'wrapper' },
        animations: [],
        style: { fill: 'lightblue', opacity: 0.8 },
        defaults: {
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
      style: { fill: 'lightblue' },
      transforms: [{ kind: 'scale' as const, x: 1.5, pivot: [2, 3] as [number, number] }],
      placement: { target: [10, 20] as [number, number] },
      defaults: { node: { style: { fill: 'white' } }, reset: ['label' as const] },
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

  it('接受空对象（nodeDefault={{}} 无效果但合法）', () => {
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
  it('接受完整 path 默认原子字段集合（不含 children）', () => {
    expect(
      PathDefaultSchema.safeParse({
        roundedCorners: 3,
        rotate: 30,
        scale: { x: 1.5, y: 2 },
        style: {
          color: 'crimson',
          fill: '#fee2e2',
          fillOpacity: 0.4,
          stroke: 'red',
          strokeWidth: 2,
          strokeOpacity: 0.7,
          opacity: 0.8,
          shadow: 'sm',
          blendMode: 'multiply',
          dashPattern: [4, 2],
          dashOffset: -1,
          lineCap: 'round',
          lineJoin: 'bevel',
          fillRule: 'evenodd',
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

  it('拒被排除字段 arrow（走 arrowDefault 通道）', () => {
    expect(PathDefaultSchema.safeParse({ arrow: '->' }).success).toBe(false);
  });

  it('拒被排除字段 arrowDetail', () => {
    expect(PathDefaultSchema.safeParse({ arrowDetail: { shape: 'stealth' } }).success).toBe(false);
  });

  it('拒被排除字段 children / type', () => {
    expect(PathDefaultSchema.safeParse({ children: [] }).success).toBe(false);
    expect(PathDefaultSchema.safeParse({ type: 'path' }).success).toBe(false);
  });

  it('拒 instance / structure / decoration 字段', () => {
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

  it('接受数值派生 textColor，但拒绝数值 label master', () => {
    expect(LabelDefaultSchema.safeParse({ textColor: 0.6 }).success).toBe(true);
    expect(LabelDefaultSchema.safeParse({ color: 0.6 }).success).toBe(false);
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
    expect(ArrowDefaultSchema.safeParse({ shape: 'stealth', scale: 1.5 }).success).toBe(true);
  });

  it('= ArrowDetailSchema：接受 start / end 子对象', () => {
    expect(
      ArrowDefaultSchema.safeParse({
        shape: 'normal',
        end: { shape: 'circle' },
      }).success,
    ).toBe(true);
  });

  it('接受从 Path master 派生的数值 color 与从 arrow color 派生的数值 fill', () => {
    expect(ArrowDefaultSchema.safeParse({ color: 0.9, fill: 0.2, end: { color: 0.8, fill: 0.1 } }).success).toBe(true);
  });

  it('接受任意非空白 shape 名（未注册名拒绝移到 compile 期）', () => {
    // shape 已开成开放字符串（NonBlankStringSchema）：schema 不再门控名字白名单，
    // 未注册名的拒绝移到 compile 期（见 arrows/builtin-registry.test.ts 的 compile throw 用例）
    expect(ArrowDefaultSchema.safeParse({ shape: 'bogus' }).success).toBe(true);
  });

  it.each(['', '   '])('拒绝空白 shape %j', shape => {
    expect(ArrowDefaultSchema.safeParse({ shape }).success).toBe(false);
  });
});

describe('ScopeSchema 级联 graphic state', () => {
  it('接受 color 主色', () => {
    expect(
      ScopeSchema.safeParse({
        type: 'scope',
        children: [],
        style: { color: 'blue' },
      }).success,
    ).toBe(true);
  });

  it('接受全部级联分项', () => {
    expect(
      ScopeSchema.safeParse({
        type: 'scope',
        children: [],
        style: {
          color: 'blue',
          stroke: 'red',
          fill: 'yellow',
          strokeWidth: 2,
          opacity: 0.5,
          fillOpacity: 0.4,
          strokeOpacity: 0.3,
        },
      }).success,
    ).toBe(true);
  });

  it('接受数值派生级联 paint，并保持 Scope color string-only', () => {
    expect(
      ScopeSchema.safeParse({
        type: 'scope',
        children: [],
        style: { fill: 0.08, stroke: 1 },
      }).success,
    ).toBe(true);
    expect(
      ScopeSchema.safeParse({
        type: 'scope',
        children: [],
        style: { color: 0.4 },
      }).success,
    ).toBe(false);
  });

  it('级联 opacity 越界拒', () => {
    expect(
      ScopeSchema.safeParse({
        type: 'scope',
        children: [],
        style: { opacity: 1.5 },
      }).success,
    ).toBe(false);
  });
});

describe('ScopeSchema 四通道 every-X', () => {
  it('接受 nodeDefault / pathDefault / labelDefault / arrowDefault', () => {
    expect(
      ScopeSchema.safeParse({
        type: 'scope',
        children: [],
        defaults: {
          node: {
            shape: 'circle',
            style: { fill: 'lightblue' },
          },
          path: {
            style: { stroke: 'green' },
          },
          label: { font: { size: 10 } },
          arrow: { shape: 'stealth', scale: 1.5 },
        },
      }).success,
    ).toBe(true);
  });

  it('nodeDefault 含被排除字段（position）拒', () => {
    expect(
      ScopeSchema.safeParse({
        type: 'scope',
        children: [],
        defaults: { node: { position: [0, 0] } },
      }).success,
    ).toBe(false);
  });

  it('pathDefault 含 arrow 拒', () => {
    expect(
      ScopeSchema.safeParse({
        type: 'scope',
        children: [],
        defaults: { path: { arrow: '->' } },
      }).success,
    ).toBe(false);
  });
});

describe('ScopeSchema resetStyle 屏障', () => {
  it('接受 resetStyle: true', () => {
    expect(
      ScopeSchema.safeParse({
        type: 'scope',
        children: [],
        defaults: { reset: true },
      }).success,
    ).toBe(true);
  });

  it('接受 resetStyle 通道数组', () => {
    expect(
      ScopeSchema.safeParse({
        type: 'scope',
        children: [],
        defaults: { reset: ['node', 'path', 'label', 'arrow'] },
      }).success,
    ).toBe(true);
  });

  it('resetStyle 含非法通道拒', () => {
    expect(
      ScopeSchema.safeParse({
        type: 'scope',
        children: [],
        defaults: { reset: ['nope'] },
      }).success,
    ).toBe(false);
  });

  it('resetStyle 为数字拒', () => {
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
  it('级联 + 四通道 + resetStyle scope 序列化往返语义等价', () => {
    const ir = {
      type: 'scope' as const,
      children: [
        {
          type: 'node' as const,
          position: [0, 0] as [number, number],
          style: { color: 'red' },
        },
      ],
      style: { color: 'blue', strokeWidth: 2 },
      defaults: {
        node: {
          shape: 'circle' as const,
          style: { fill: 'lightblue' },
        },
        path: {
          style: { stroke: 'green' },
        },
        label: { font: { size: 10 } },
        arrow: { shape: 'stealth' as const, scale: 1.5 },
        reset: ['label' as const],
      },
    };
    const restored = ScopeSchema.parse(JSON.parse(JSON.stringify(ir)));
    expect(restored).toEqual(ir);
  });
});

describe('Node / Path 主色 color 字段', () => {
  it('Node 接受 color', async () => {
    const { NodeSchema } = await import('../../src/schemas');
    expect(
      NodeSchema.safeParse({
        type: 'node',
        position: [0, 0],
        style: { color: 'blue' },
      }).success,
    ).toBe(true);
  });

  it('Path 接受 color', async () => {
    const { PathSchema } = await import('../../src/schemas');
    expect(
      PathSchema.safeParse({
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'line', to: [10, 0] },
        ],
        style: { color: 'crimson' },
      }).success,
    ).toBe(true);
  });
});
