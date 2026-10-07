import type { IRChild, ScenePrimitive, LayoutChildResult, LayoutProposal } from '@retikz/core';
import { ChildSchema, CompositeBaseSchema, compileToScene, defineComposite, LayoutChildProbeKind } from '@retikz/core';
import { PathClipDefinition } from '@retikz/extension';
import { expect, it } from 'vitest';
import { literal } from 'zod';

import { ArrayDefinition, MapDefinition } from '../../../src/collection';
import { StackDefinition } from '../../../src/collection/stack';

const base = { namespace: 'standard', type: 'stack' } as const;
const compile = (child: IRChild) =>
  compileToScene(
    { type: 'scene', version: 1, children: [child] },
    { composites: [StackDefinition, ArrayDefinition, MapDefinition], clips: [PathClipDefinition], padding: 0 },
  );
const flat = (nodes: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> =>
  nodes.flatMap(n => (n.type === 'group' ? flat(n.children) : [n]));
const bounds = (result: ReturnType<typeof compile>, role: string) =>
  result.spatialHandles.entries.filter(e => e.role === role).map(e => e.geometry.bounds);

it('父布局额外空间不拉伸单元或开放边框，过小的proposal失败', () => {
  const probe = (proposal: LayoutProposal) => {
    let observed: LayoutChildResult | undefined;
    const harness = defineComposite({
      namespace: 'stack-test',
      type: 'harness',
      schema: CompositeBaseSchema.extend({
        namespace: literal('stack-test'),
        type: literal('harness'),
        child: ChildSchema,
      }),
      compile: (node, context) => {
        const result = context.layoutChild(node.child, proposal);
        if (result.kind === LayoutChildProbeKind.Failed) return context.raise(result.failure);
        observed = result.result;
        return { children: [context.replay(result.result)] };
      },
    });
    const result = compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [
          {
            namespace: 'stack-test',
            type: 'harness',
            child: {
              ...base,
              items: [{ id: 'a' }],
              layout: { width: 20, height: 10 },
              border: { meta: { outline: true } },
            },
          },
        ],
      },
      { composites: [harness, StackDefinition], clips: [PathClipDefinition], padding: 0 },
    );
    return { result, observed };
  };
  for (const proposal of [
    { x: { kind: 'exact', value: 100 }, y: { kind: 'exact', value: 80 } },
    { x: { kind: 'range', min: 100, max: 120 }, y: { kind: 'range', min: 80, max: 90 } },
  ] satisfies Array<LayoutProposal>) {
    const { result, observed } = probe(proposal);
    expect(observed?.allocationBounds).toEqual({ x: 0, y: 0, width: 100, height: 80 });
    expect(bounds(result, 'stack-cell')).toEqual([{ x: 8, y: 8, width: 20, height: 10 }]);
    const outline = flat(result.scene.primitives).find(p => p.type === 'path' && p.meta?.outline === true);
    if (outline?.type !== 'path') throw new Error('Missing Stack border');
    expect(outline.commands.at(-1)).toEqual({ kind: 'line', to: [36, 0] });
  }
  expect(() => probe({ x: { kind: 'exact', value: 10 }, y: { kind: 'exact', value: 80 } })).toThrow();
});

it.each([
  [
    'up',
    [
      { x: 8, y: 36, width: 30, height: 20 },
      { x: 8, y: 8, width: 30, height: 20 },
    ],
  ],
  [
    'down',
    [
      { x: 8, y: 8, width: 30, height: 20 },
      { x: 8, y: 36, width: 30, height: 20 },
    ],
  ],
  [
    'left',
    [
      { x: 46, y: 8, width: 30, height: 20 },
      { x: 8, y: 8, width: 30, height: 20 },
    ],
  ],
  [
    'right',
    [
      { x: 8, y: 8, width: 30, height: 20 },
      { x: 46, y: 8, width: 30, height: 20 },
    ],
  ],
] as const)('%s方向最后项朝向开放端且不改变id顺序', (direction, expected) => {
  const result = compile({
    ...base,
    items: [{ id: 'bottom' }, { id: 'top' }],
    layout: { direction, width: 30, height: 20 },
  });
  expect(bounds(result, 'stack-cell')).toEqual(expected);
});
it('主轴保留各格尺寸，交叉轴auto填满且固定小格居中', () => {
  const result = compile({
    ...base,
    border: false,
    padding: 0,
    items: [
      { id: 'a', layout: { width: 40, height: 10 } },
      { id: 'b', layout: { width: 20, height: 30 } },
      { id: 'c' },
    ],
    layout: { direction: 'down' },
  });
  expect(bounds(result, 'stack-cell')).toEqual([
    { x: 0, y: 0, width: 40, height: 10 },
    { x: 10, y: 18, width: 20, height: 30 },
    { x: 0, y: 56, width: 40, height: 16 },
  ]);
});
it('空栈只有padding容器且不显示栈顶标签，移除边框和留白后为零', () => {
  const result = compile({ ...base, items: [] });
  expect(bounds(result, 'container')).toEqual([{ x: 0, y: 0, width: 16, height: 16 }]);
  expect(flat(result.scene.primitives).some(p => p.type === 'text')).toBe(false);
  expect(bounds(result, 'stack-cell')).toEqual([]);
  expect(bounds(compile({ ...base, items: [], border: false, padding: 0 }), 'container')).toEqual([
    { x: 0, y: 0, width: 0, height: 0 },
  ]);
});
it('骨架与显式单元等价，箭头不改变allocation', () => {
  const props = { ...base, layout: { width: 32, height: 24 } };
  expect(compile({ ...props, skeleton: { labels: ['A', ''] } }).scene).toEqual(
    compile({ ...props, items: ['A', {}] }).scene,
  );
  const plain = compile({ ...props, items: ['A', 'B'] });
  const labelled = compile({ ...props, items: ['A', 'B'], arrow: { input: false, output: false } });
  expect(bounds(labelled, 'container')).toEqual(bounds(plain, 'container'));
  expect(
    flat(labelled.scene.primitives)
      .filter(p => p.type === 'text')
      .map(p => p.lines.map(l => l.text).join('')),
  ).toEqual(['A', 'B']);
});

it('开放边框只有三边，隐藏边框不改变独立留白', () => {
  const props = {
    ...base,
    items: [{}],
    layout: { width: 20, height: 10 },
    padding: { left: 1, right: 3, top: 5, bottom: 7 },
  };
  const result = compile({ ...props, border: { meta: { outline: true } } });
  const outline = flat(result.scene.primitives).find(p => p.type === 'path' && p.meta?.outline === true);
  expect(outline?.type).toBe('path');
  if (outline?.type === 'path')
    expect(outline.commands).toEqual([
      { kind: 'move', to: [0, 0] },
      { kind: 'line', to: [0, 22] },
      { kind: 'line', to: [24, 22] },
      { kind: 'line', to: [24, 0] },
    ]);
  expect(bounds(compile({ ...props, border: false }), 'container')).toEqual(bounds(result, 'container'));
});
it('根frame与开放border独立，外部连接命中变换后的单格而非外框', () => {
  const result = compile({
    type: 'scope',
    children: [
      {
        ...base,
        id: 'root',
        frame: { padding: 2, style: { stroke: 'red' } },
        items: [{ id: 'target' }],
        layout: { width: 20, height: 10 },
        transforms: [{ kind: 'translate', x: 7, y: 11 }],
      },
      {
        type: 'path',
        meta: { external: true },
        children: [
          { type: 'step', kind: 'move', to: [70, 24] },
          { type: 'step', kind: 'line', to: { id: 'target', anchor: 'right' } },
        ],
      },
      {
        ...base,
        id: 'local',
        localNamespace: true,
        items: [{ id: 'target' }],
        transforms: [{ kind: 'translate', x: 100, y: 0 }],
      },
    ],
  });
  const path = flat(result.scene.primitives).find(p => p.type === 'path' && p.meta?.external === true);
  expect(path?.type).toBe('path');
  if (path?.type === 'path') expect(path.commands.at(-1)).toEqual({ kind: 'line', to: [35, 24] });
  expect(result.spatialHandles.entries.filter(e => e.id === 'cell:target')).toHaveLength(2);
});
it('嵌套Stack不叠加外层padding，显式覆盖仍然优先', () => {
  const child = { ...base, items: ['A'], layout: { width: 20, height: 10 } };
  const nested = compile({ namespace: 'standard', type: 'array', items: [{ id: 'outer', content: child }] });
  const explicit = compile({
    namespace: 'standard',
    type: 'array',
    items: [{ id: 'outer', content: child, layout: { padding: 5 } }],
  });
  const natural = bounds(compile(child), 'container')[0];
  const outer = bounds(nested, 'array-cell')[0];
  expect(outer.width).toBeGreaterThanOrEqual(natural.width);
  expect(bounds(explicit, 'array-cell')[0].width - outer.width).toBe(10);
});

it.each([
  [
    'up',
    [
      [-15, -32],
      [9, -32],
      [9, -8],
    ],
    [
      [27, -8],
      [27, -32],
      [51, -32],
    ],
  ],
  [
    'down',
    [
      [51, 58],
      [27, 58],
      [27, 34],
    ],
    [
      [9, 34],
      [9, 58],
      [-15, 58],
    ],
  ],
  [
    'right',
    [
      [68, -17.5],
      [68, 6.5],
      [44, 6.5],
    ],
    [
      [44, 19.5],
      [68, 19.5],
      [68, 43.5],
    ],
  ],
  [
    'left',
    [
      [-32, 43.5],
      [-32, 19.5],
      [-8, 19.5],
    ],
    [
      [-8, 6.5],
      [-32, 6.5],
      [-32, -17.5],
    ],
  ],
] as const)(
  '%s operation paths match manual Core geometry and preserve allocation',
  (direction, incoming, outgoing) => {
    const source = { ...base, items: [{ id: 'cell' }], layout: { direction, width: 20, height: 10 } };
    const actual = compile({ ...source, arrow: { input: true, output: true } });
    const disabled = compile({ ...source, arrow: { input: false, output: false } });
    const path = (points: ReadonlyArray<readonly [number, number]>) => ({
      type: 'path' as const,
      style: { stroke: 'currentColor', strokeWidth: 1, fill: 'none' },
      marks: [{ pos: 1, mark: { kind: 'arrow' as const } }],
      children: points.map((point, index) => ({
        type: 'step' as const,
        kind: index === 0 ? ('move' as const) : ('line' as const),
        to: [point[0], point[1]] as [number, number],
      })),
    });
    const expected = compile({
      type: 'scope',
      children: [{ ...source, arrow: { input: false, output: false } }, path(incoming), path(outgoing)],
    });
    expect(flat(actual.scene.primitives).filter(p => p.type === 'path')).toEqual(
      flat(expected.scene.primitives).filter(p => p.type === 'path'),
    );
    expect(bounds(actual, 'container')).toEqual(bounds(disabled, 'container'));
    const swapped = compile({
      ...source,
      layout: { ...source.layout, reverseArrows: true },
      arrow: { input: true, output: true },
    });
    const swappedExpected = compile({
      type: 'scope',
      children: [source, path([...outgoing].reverse()), path([...incoming].reverse())],
    });
    expect(flat(swapped.scene.primitives).filter(p => p.type === 'path')).toEqual(
      flat(swappedExpected.scene.primitives).filter(p => p.type === 'path'),
    );
    expect(swapped.spatialHandles.entries).toEqual(actual.spatialHandles.entries);
  },
);
it('empty collections suppress arrows and each custom arrow can be independently disabled', () => {
  const props = {
    ...base,
    items: [{}],
    arrow: {
      input: { style: { stroke: 'blue', dashPattern: [3, 2] }, arrowDetail: { shape: 'openStealth' } },
      output: { style: { stroke: 'red' }, arrowDetail: { shape: 'normal' } },
    },
  };
  for (const [incomingArrow, outgoingArrow] of [
    [false, props.arrow.output],
    [props.arrow.input, false],
    [props.arrow.input, props.arrow.output],
  ] as const) {
    const output = JSON.stringify(compile({ ...props, arrow: { input: incomingArrow, output: outgoingArrow } }).scene);
    expect(output.includes('blue')).toBe(incomingArrow !== false);
    expect(output.includes('red')).toBe(outgoingArrow !== false);
  }
  const empty = JSON.stringify(compile({ ...props, items: [] }).scene);
  expect(empty).not.toContain('blue');
  expect(empty).not.toContain('red');
});

it('operation arrows are absent by default and explicitly enabled without changing cells', () => {
  const source = { ...base, items: ['A'] };
  const plain = compile(source);
  expect(plain.scene).toEqual(compile({ ...source, arrow: { input: false, output: false } }).scene);
  expect(flat(plain.scene.primitives).some(p => p.type === 'path' && p.arrowEnd !== undefined)).toBe(false);
  expect(
    flat(compile({ ...source, arrow: { input: true, output: true } }).scene.primitives).filter(
      p => p.type === 'path' && p.arrowEnd !== undefined,
    ),
  ).toHaveLength(2);
});

it('arrow shorthand and omitted sides preserve independent operation semantics', () => {
  const source = { ...base, items: ['A', 'B'] };
  expect(compile({ ...source, arrow: true }).scene).toEqual(
    compile({ ...source, arrow: { input: true, output: true } }).scene,
  );
  for (const arrow of [false, {}] as const) expect(compile({ ...source, arrow }).scene).toEqual(compile(source).scene);
  for (const arrow of [{ input: true }, { output: true }] as const) {
    const result = compile({ ...source, arrow });
    expect(flat(result.scene.primitives).filter(p => p.type === 'path' && p.arrowEnd !== undefined)).toHaveLength(1);
    expect(bounds(result, 'container')).toEqual(bounds(compile(source), 'container'));
  }
  expect(compile({ ...source, items: [], arrow: true }).scene).toEqual(
    compile({ ...source, items: [], arrow: false }).scene,
  );
});
