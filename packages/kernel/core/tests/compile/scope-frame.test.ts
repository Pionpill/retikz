import { describe, expect, it } from 'vitest';

import { compileToScene, definePattern, ScopeFrameSchema, ScopeSchema } from '../../src';
import type { IRScope, ScenePrimitive } from '../../src';

const content: IRScope['children'] = [
  {
    type: 'node',
    id: 'content',
    position: [0, 0],
    layout: { minimumSize: { width: 40, height: 20 }, padding: 0 },
    style: { fill: 'blue', strokeWidth: 0 },
    zIndex: -100,
  },
];
const compile = (scope: IRScope) => compileToScene({ version: 1, type: 'scene', children: [scope] }).scene;
const childrenOf = (primitive: ScenePrimitive | undefined) => (primitive?.type === 'group' ? primitive.children : []);

describe('Scope frame', () => {
  it('schema 物化 padding 默认并拒绝非法间距和额外字段', () => {
    expect(ScopeFrameSchema.parse({})).toMatchObject({ padding: 0 });
    for (const padding of [-1, Infinity, NaN]) expect(ScopeFrameSchema.safeParse({ padding }).success).toBe(false);
    expect(ScopeFrameSchema.safeParse({ id: 'frame' }).success).toBe(false);
    const parsed = ScopeSchema.parse({ type: 'scope', frame: {}, children: [] });
    expect(ScopeSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });
  it('默认外框不继承填充、透明度或节点默认，且始终位于负 zIndex 内容下面', () => {
    const scope: IRScope = {
      type: 'scope',
      style: { color: 'red', fill: 'green', opacity: 0.2 },
      defaults: { node: { style: { shadow: 'lg' } } },
      children: content,
    };
    const plain = compile(scope);
    const framed = compile({ ...scope, frame: {} });
    const output = childrenOf(framed.primitives[0]);
    expect(output).toHaveLength(childrenOf(plain.primitives[0]).length + 1);
    expect(output[0]).toMatchObject({ type: 'rect', fill: 'none', stroke: 'red', strokeWidth: 1, hitTest: false });
    expect(output[0]).not.toHaveProperty('shadow');
    expect(output.slice(1)).toEqual(childrenOf(plain.primitives[0]));
  });
  it('padding 只扩大外框与取景，不改变后代内容', () => {
    const plain = compile({ type: 'scope', children: content });
    const framed = compile({ type: 'scope', frame: { padding: 10 }, children: content });
    expect(childrenOf(framed.primitives[0])[0]).toMatchObject({ type: 'rect', x: -30, y: -20, width: 60, height: 40 });
    expect(childrenOf(framed.primitives[0]).slice(1)).toEqual(childrenOf(plain.primitives[0]));
    expect(framed.layout.width).toBeGreaterThan(plain.layout.width);
  });
  it('空组即使有 padding 也没有外框', () => {
    expect(compile({ type: 'scope', frame: { padding: 20 }, children: [] }).primitives).toEqual([]);
  });
  it('嵌套外框不会扩大祖先固有包络', () => {
    const nested = (padding: number) =>
      compile({
        type: 'scope',
        frame: {},
        children: [{ type: 'scope', id: 'inner', frame: { padding }, children: content }],
      });
    expect(childrenOf(nested(0).primitives[0])[0]).toEqual(childrenOf(nested(100).primitives[0])[0]);
  });
  it('圆形包络按半径扩展且跟随所属组变换', () => {
    const scene = compile({
      type: 'scope',
      boundingShape: 'circle',
      transforms: [{ kind: 'translate', x: 80, y: 20 }],
      frame: { padding: 10 },
      children: content,
    });
    expect(scene.primitives[0]).toMatchObject({ transforms: [{ kind: 'translate', x: 80, y: 20 }] });
    const circle = childrenOf(scene.primitives[0])[0];
    expect(circle.type).toBe('ellipse');
    if (circle.type === 'ellipse') {
      expect(circle.rx).toBeCloseTo(Math.hypot(20, 10) + 10, 2);
      expect(circle.ry).toEqual(circle.rx);
    }
  });
});

it('描边和阴影进入自动取景，clip 限制外框而显式 viewBox 不变', () => {
  const scope: IRScope = {
    type: 'scope',
    frame: { padding: 10, style: { strokeWidth: 10, shadow: { offsetX: 5, offsetY: 5, blur: 0 } } },
    children: content,
  };
  const ir = { version: 1 as const, type: 'scene' as const, children: [scope] };
  expect(compileToScene(ir, { padding: 0 }).scene.layout).toEqual({ x: -35, y: -25, width: 75, height: 55 });
  expect(
    compileToScene(
      { ...ir, children: [{ ...scope, clip: { kind: 'rect', x: -20, y: -10, width: 40, height: 20 } }] },
      { padding: 0 },
    ).scene.layout,
  ).toEqual({ x: -20, y: -10, width: 40, height: 20 });
  expect(compileToScene({ ...ir, viewBox: { x: 0, y: 0, width: 100, height: 100 } }).scene.layout).toEqual({
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  });
});

it('显式 undefined 使用默认值，上下文数值颜色由有效 Scope 主色解析', () => {
  const scene = compile({
    type: 'scope',
    style: { color: '#ff0000' },
    frame: { style: { fill: 1, stroke: undefined, strokeWidth: undefined } },
    children: content,
  });
  expect(childrenOf(scene.primitives[0])[0]).toMatchObject({ fill: '#ff0000', stroke: '#ff0000', strokeWidth: 1 });
});

it('祖先裁剪同样限制后代外框的自动取景', () => {
  const ir = {
    version: 1 as const,
    type: 'scene' as const,
    children: [
      {
        type: 'scope' as const,
        clip: { kind: 'rect', x: -20, y: -10, width: 40, height: 20 },
        children: [{ type: 'scope' as const, frame: { padding: 100 }, children: content }],
      },
    ],
  };
  expect(compileToScene(ir, { padding: 0 }).scene.layout).toEqual({ x: -20, y: -10, width: 40, height: 20 });
});

it('外框与 Node 共用自定义图案资源，未注册图案保持诊断', () => {
  const pattern = definePattern({
    name: 'frame-motif',
    emit: ({ size, color }) => [{ type: 'rect', x: 0, y: 0, width: size / 2, height: size / 2, fill: color }],
  });
  const paint = { kind: 'pattern' as const, shape: 'frame-motif', color: 'red' };
  const ir = {
    version: 1 as const,
    type: 'scene' as const,
    children: [
      {
        type: 'scope' as const,
        frame: { style: { fill: paint } },
        children: [{ type: 'node' as const, position: [0, 0] as [number, number], style: { fill: paint } }],
      },
    ],
  };
  const { scene } = compileToScene(ir, { patterns: [pattern] });
  expect(scene.resources).toHaveLength(1);
  const output = childrenOf(scene.primitives[0]);
  expect(output[0]).toMatchObject({ fill: { kind: 'resourceRef' } });
  expect(output[0]).toHaveProperty('fill', output[1].type === 'rect' ? output[1].fill : undefined);
  expect(() => compileToScene(ir)).toThrow(/frame-motif/);
});

it('不扩大既有 Path 包络语义，外框不改变整体锚点连接', () => {
  const children: IRScope['children'] = [
    {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [40, 20] },
      ],
    },
  ];
  const scene = compile({ type: 'scope', frame: { padding: 5 }, children });
  expect(childrenOf(scene.primitives[0]).some(primitive => primitive.hitTest === false)).toBe(false);
  const connected = (padding?: number) =>
    compileToScene({
      version: 1,
      type: 'scene',
      children: [
        { type: 'scope', id: 'group', ...(padding === undefined ? {} : { frame: { padding } }), children: content },
        {
          type: 'path',
          id: 'link',
          children: [
            { type: 'step', kind: 'move', to: { id: 'group', anchor: 'right' } },
            { type: 'step', kind: 'line', to: [100, 0] },
          ],
        },
      ],
    }).scene.primitives.find(primitive => primitive.id === 'link');
  expect(connected(100)).toEqual(connected());
});

it('非空退化包络仍可通过 padding 绘制外框', () => {
  const scene = compile({
    type: 'scope',
    frame: { padding: 10 },
    children: [{ type: 'coordinate', id: 'point', position: [25, 30] }],
  });
  expect(childrenOf(scene.primitives[0])[0]).toMatchObject({
    type: 'rect',
    x: 15,
    y: 20,
    width: 20,
    height: 20,
    hitTest: false,
  });
});
