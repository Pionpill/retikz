import type { IRChild, ScenePrimitive, LayoutChildResult, LayoutProposal } from '@retikz/core';
import { ChildSchema, CompositeBaseSchema, compileToScene, defineComposite, LayoutChildProbeKind } from '@retikz/core';
import { PathClipDefinition } from '@retikz/extension';
import { expect, it } from 'vitest';
import { literal } from 'zod';

import { ArrayDefinition, MapDefinition } from '../../../src/collection';
import { QueueDefinition } from '../../../src/collection/queue';

const base = { namespace: 'standard', type: 'queue' } as const;
const compile = (child: IRChild) =>
  compileToScene(
    { type: 'scene', version: 1, children: [child] },
    { composites: [QueueDefinition, ArrayDefinition, MapDefinition], clips: [PathClipDefinition], padding: 0 },
  );
const flat = (nodes: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> =>
  nodes.flatMap(n => (n.type === 'group' ? flat(n.children) : [n]));
const bounds = (result: ReturnType<typeof compile>, role: string) =>
  result.spatialHandles.entries.filter(e => e.role === role).map(e => e.geometry.bounds);

it.each([
  ['right', [8, 8, 46, 8]],
  ['left', [46, 8, 8, 8]],
  ['down', [8, 8, 8, 36]],
  ['up', [8, 36, 8, 8]],
] as const)('%s保持队首先、队尾后，实际边界随方向排列', (direction, coords) => {
  const result = compile({
    ...base,
    items: [{ id: 'front' }, { id: 'back' }],
    layout: { direction, width: 30, height: 20 },
  });
  expect(bounds(result, 'queue-cell')).toEqual([
    { x: coords[0], y: coords[1], width: 30, height: 20 },
    { x: coords[2], y: coords[3], width: 30, height: 20 },
  ]);
});
it.each(['right', 'left', 'up', 'down'] as const)('%s边框只有两条独立边，隐藏后保留padding', direction => {
  const props = {
    ...base,
    items: [{}],
    layout: { direction, width: 20, height: 10 },
    padding: { left: 1, right: 3, top: 5, bottom: 7 },
  };
  const result = compile({ ...props, border: { meta: { outline: true } } });
  const border = flat(result.scene.primitives).find(p => p.type === 'path' && p.meta?.outline === true);
  if (border?.type !== 'path') throw new Error('Missing outline');
  const horizontal = direction === 'right' || direction === 'left';
  expect(border.commands).toEqual(
    horizontal
      ? [
          { kind: 'move', to: [0, 0] },
          { kind: 'line', to: [24, 0] },
          { kind: 'move', to: [0, 22] },
          { kind: 'line', to: [24, 22] },
        ]
      : [
          { kind: 'move', to: [0, 0] },
          { kind: 'line', to: [0, 22] },
          { kind: 'move', to: [24, 0] },
          { kind: 'line', to: [24, 22] },
        ],
  );
  expect(bounds(compile({ ...props, border: false }), 'container')).toEqual(bounds(result, 'container'));
});
it('主轴独立尺寸、交叉auto填满且固定小格居中', () => {
  const result = compile({
    ...base,
    padding: 0,
    border: false,
    items: [
      { id: 'a', layout: { width: 10, height: 40 } },
      { id: 'b', layout: { width: 30, height: 20 } },
      { id: 'c' },
    ],
  });
  expect(bounds(result, 'queue-cell')).toEqual([
    { x: 0, y: 0, width: 10, height: 40 },
    { x: 18, y: 10, width: 30, height: 20 },
    { x: 56, y: 0, width: 16, height: 40 },
  ]);
});
it('空队列无进出箭头，单格可同时附着进出箭头而不撑大allocation', () => {
  const labels = {
    arrow: { input: true, output: true },
  } as const;
  const empty = compile({ ...base, items: [], ...labels });
  expect(bounds(empty, 'container')).toEqual([{ x: 0, y: 0, width: 16, height: 16 }]);
  expect(flat(empty.scene.primitives).some(p => p.type === 'text')).toBe(false);
  expect(bounds(compile({ ...base, items: [], padding: 0, border: false }), 'container')).toEqual([
    { x: 0, y: 0, width: 0, height: 0 },
  ]);
  const single = compile({ ...base, items: [{ id: 'only' }], layout: { width: 30, height: 20 }, ...labels });
  expect(bounds(single, 'container')).toEqual([{ x: 0, y: 0, width: 46, height: 36 }]);
  expect(
    flat(single.scene.primitives)
      .filter(p => p.type === 'text')
      .map(p => p.lines.map(l => l.text).join('')),
  ).toEqual([]);
});
it('骨架与显式单元等价', () => {
  expect(compile({ ...base, skeleton: { labels: ['A', ''] } }).scene).toEqual(
    compile({ ...base, items: ['A', {}] }).scene,
  );
});
it('根frame、变换与外部连线命中实际单格，局部命名空间可复用id', () => {
  const result = compile({
    type: 'scope',
    children: [
      {
        ...base,
        id: 'q',
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
  if (path?.type !== 'path') throw new Error('Missing connection');
  expect(path.commands.at(-1)).toEqual({ kind: 'line', to: [35, 24] });
  expect(bounds(result, 'queue-cell')).toHaveLength(2);
});
it('嵌套Queue免去额外单格留白，显式覆盖优先', () => {
  const child = { ...base, items: ['A'], layout: { width: 20, height: 10 } };
  const nested = compile({ namespace: 'standard', type: 'array', items: [{ id: 'outer', content: child }] });
  const explicit = compile({
    namespace: 'standard',
    type: 'array',
    items: [{ id: 'outer', content: child, layout: { padding: 5 } }],
  });
  expect(bounds(explicit, 'array-cell')[0].width - bounds(nested, 'array-cell')[0].width).toBe(10);
});

it('父布局额外空间不拉伸单元或开放边框，过小的proposal失败', () => {
  const probe = (proposal: LayoutProposal) => {
    let observed: LayoutChildResult | undefined;
    const harness = defineComposite({
      namespace: 'queue-test',
      type: 'harness',
      schema: CompositeBaseSchema.extend({
        namespace: literal('queue-test'),
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
            namespace: 'queue-test',
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
      { composites: [harness, QueueDefinition], clips: [PathClipDefinition], padding: 0 },
    );
    return { result, observed };
  };
  for (const proposal of [
    { x: { kind: 'exact', value: 100 }, y: { kind: 'exact', value: 80 } },
    { x: { kind: 'range', min: 100, max: 120 }, y: { kind: 'range', min: 80, max: 90 } },
  ] satisfies Array<LayoutProposal>) {
    const { result, observed } = probe(proposal);
    expect(observed?.allocationBounds).toEqual({ x: 0, y: 0, width: 100, height: 80 });
    expect(bounds(result, 'queue-cell')).toEqual([{ x: 8, y: 8, width: 20, height: 10 }]);
    const outline = flat(result.scene.primitives).find(p => p.type === 'path' && p.meta?.outline === true);
    if (outline?.type !== 'path') throw new Error('Missing Queue border');
    expect(outline.commands.at(-1)).toEqual({ kind: 'line', to: [36, 26] });
  }
  expect(() => probe({ x: { kind: 'exact', value: 10 }, y: { kind: 'exact', value: 80 } })).toThrow();
});

it.each([
  [
    'right',
    [
      [68, 13],
      [44, 13],
    ],
    [
      [-8, 13],
      [-32, 13],
    ],
  ],
  [
    'left',
    [
      [-32, 13],
      [-8, 13],
    ],
    [
      [44, 13],
      [68, 13],
    ],
  ],
  [
    'down',
    [
      [18, 58],
      [18, 34],
    ],
    [
      [18, -8],
      [18, -32],
    ],
  ],
  [
    'up',
    [
      [18, -32],
      [18, -8],
    ],
    [
      [18, 34],
      [18, 58],
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
