import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { FlowLayoutDefinition, IRFlowDiagram } from '../../src/flow';
import {
  createFlowDiagramProviderContribution,
  FlowDiagramArtifactSchema,
  FlowDiagramSchema,
  layeredFlowLayoutDefinition,
} from '../../src/flow';

const source = (equal = true): IRFlowDiagram => ({
  namespace: 'diagram',
  type: 'flow',
  entities: [
    { id: 'a', text: 'A', role: 'activity' },
    { id: 'b', text: 'B', role: 'activity' },
    { id: 'c', text: 'C', role: 'activity' },
  ],
  groups: [
    { id: 'short', children: ['a'], padding: 12, caption: { title: { text: 'Short' } } },
    { id: 'tall', children: ['column'], padding: 20, caption: { title: { text: 'Tall' } } },
  ],
  layouts: [
    {
      id: 'row',
      kind: 'linear',
      direction: 'right',
      align: 'start',
      ...(equal ? { containerHeight: 'match-largest' as const } : {}),
      children: ['short', 'tall'],
    },
    { id: 'column', kind: 'linear', direction: 'down', children: ['b', 'c'] },
  ],
  children: ['row'],
  relations: [{ source: 'b', target: 'c', label: 'Continue' }],
});

const compile = (input: IRFlowDiagram, definition = layeredFlowLayoutDefinition) => {
  const result = compileToScene(
    { type: 'scene', version: 1, children: [FlowDiagramSchema.parse(input)] },
    {
      ...resolveCoreProviderDependencies({
        contributions: [
          createFlowDiagramProviderContribution({ flowLayouts: [definition], defaultFlowLayout: definition.name }),
        ],
      }),
      measureText: text => ({ width: text.length * 8, height: 12, ascent: 9, descent: 3 }),
    },
  );
  const artifact = FlowDiagramArtifactSchema.parse(
    result.artifacts.find(item => item.kind === 'composite' && item.namespace === 'diagram')?.value,
  );
  const row = artifact.elements[0];
  if (row.kind !== 'layout') throw new Error('Expected row');
  return { result, artifact, row };
};

describe('Flow 分组高度', () => {
  it('自然最大高度包含标题和标签，单节点保持自然尺寸与位置', () => {
    const before = compile(source(false)).row.elements;
    const after = compile(source()).row.elements;
    const maximum = Math.max(...before.map(group => group.bounds.height));
    expect(before[0].bounds.height).toBeLessThan(maximum);
    for (const [index, group] of after.entries()) {
      const original = before[index];
      if (group.kind !== 'group' || original.kind !== 'group') throw new Error('Expected group');
      expect(group.bounds.height).toBeCloseTo(maximum);
      expect(group.bounds.y).toBeCloseTo(after[0].bounds.y);
      expect(group.bounds.width).toBeCloseTo(original.bounds.width);
      for (const [childIndex, child] of group.elements.entries()) {
        const prior = original.elements[childIndex];
        expect(child.bounds.width).toBeCloseTo(prior.bounds.width);
        expect(child.bounds.height).toBeCloseTo(prior.bounds.height);
        expect(child.bounds.x - group.bounds.x).toBeCloseTo(prior.bounds.x - original.bounds.x);
        expect(child.bounds.y - group.bounds.y).toBeCloseTo(prior.bounds.y - original.bounds.y);
      }
    }
  });

  it.each([
    { direction: 'down', wrapped: false },
    { direction: 'up', wrapped: false },
    { direction: 'down', wrapped: true },
  ] as const)('纵向 $direction 布局均分剩余高度，透明包装=$wrapped', ({ direction, wrapped }) => {
    const input: IRFlowDiagram = {
      namespace: 'diagram',
      type: 'flow',
      entities: ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map(id => ({ id, text: id, role: 'activity' })),
      groups: [
        { id: 'short', children: [wrapped ? 'wrapper' : 'short-column'], padding: 16 },
        { id: 'tall', children: ['tall-column'], padding: 16 },
      ],
      layouts: [
        {
          id: 'row',
          kind: 'linear',
          direction: 'right',
          align: 'start',
          containerHeight: 'match-largest',
          children: ['short', 'tall'],
        },
        ...(wrapped
          ? [{ id: 'wrapper', kind: 'linear' as const, direction: 'right' as const, children: ['short-column'] }]
          : []),
        { id: 'short-column', kind: 'linear', direction, gap: 24, children: ['a', 'b', 'c'] },
        { id: 'tall-column', kind: 'linear', direction, gap: 24, children: ['d', 'e', 'f', 'g'] },
      ],
      relations: [{ source: 'a', target: 'b', label: 'Continue' }],
      children: ['row'],
    };
    const natural = compile({
      ...input,
      layouts: input.layouts?.map(layout =>
        layout.id === 'row'
          ? { id: 'row', kind: 'linear', direction: 'right', align: 'start', children: ['short', 'tall'] }
          : layout,
      ),
    }).row;
    const equal = compile(input).row;
    const nodes = (group: (typeof equal.elements)[number]) => {
      if (group.kind !== 'group' || group.elements[0].kind !== 'layout') throw new Error('Expected column');
      let column = group.elements[0];
      while (column.elements.length === 1 && column.elements[0].kind === 'layout') column = column.elements[0];
      return [...column.elements].sort((a, b) => a.bounds.y - b.bounds.y);
    };
    const before = nodes(natural.elements[0]);
    const after = nodes(equal.elements[0]);
    const tall = nodes(equal.elements[1]);
    expect(after[0].bounds.y).toBeCloseTo(tall[0].bounds.y);
    expect(after.at(-1)!.bounds.y + after.at(-1)!.bounds.height).toBeCloseTo(
      tall.at(-1)!.bounds.y + tall.at(-1)!.bounds.height,
    );
    const increments = after
      .slice(1)
      .map(
        (node, index) => node.bounds.y - after[index].bounds.y - (before[index + 1].bounds.y - before[index].bounds.y),
      );
    expect(increments[0]).toBeGreaterThan(0);
    expect(increments[0]).toBeCloseTo(increments[1]);
    after.forEach((node, index) => {
      expect(node.bounds.width).toBeCloseTo(before[index].bounds.width);
      expect(node.bounds.height).toBeCloseTo(before[index].bounds.height);
    });
  });

  it('反向只改变分组顺序，单组保持自然高度', () => {
    const input = source();
    const reversed = compile({
      ...input,
      layouts: input.layouts?.map(layout =>
        layout.id === 'row' && layout.kind === 'linear' ? { ...layout, direction: 'left' } : layout,
      ),
    }).row.elements;
    expect(reversed[0].bounds.height).toBeCloseTo(reversed[1].bounds.height);
    expect(reversed[0].bounds.x).toBeGreaterThan(reversed[1].bounds.x);
    const single: IRFlowDiagram = {
      namespace: 'diagram',
      type: 'flow',
      entities: [{ id: 'a', text: 'A' }],
      groups: [{ id: 'g', children: ['a'] }],
      layouts: [{ id: 'row', kind: 'linear', direction: 'right', containerHeight: 'match-largest', children: ['g'] }],
      children: ['row'],
    };
    expect(compile(single).row.elements[0].bounds.height).toBeCloseTo(
      compile({ ...single, layouts: [{ id: 'row', kind: 'linear', direction: 'right', children: ['g'] }] }).row
        .elements[0].bounds.height,
    );
  });

  it('嵌套等高先确定内层高度，底部标题仍计入外壳', () => {
    const input = source();
    const result = compile({
      ...input,
      entities: [...input.entities, { id: 'd', text: 'D' }],
      groups: [
        ...input.groups!,
        { id: 'outer', caption: { title: { text: 'Bottom' }, side: 'bottom' }, children: ['row'] },
        { id: 'other', children: ['d'] },
      ],
      layouts: [
        ...input.layouts!,
        {
          id: 'outer-row',
          kind: 'linear',
          direction: 'right',
          containerHeight: 'match-largest',
          children: ['outer', 'other'],
        },
      ],
      children: ['outer-row'],
    }).row;
    expect(result.elements[0].bounds.height).toBeCloseTo(result.elements[1].bounds.height);
    const outer = result.elements[0];
    if (outer.kind !== 'group' || outer.elements[0].kind !== 'layout') throw new Error('Expected nested groups');
    const nested = outer.elements[0].elements;
    expect(nested[0].bounds.height).toBeCloseTo(nested[1].bounds.height);
    expect(outer.bounds.height).toBeGreaterThan(nested[0].bounds.height);
  });

  it.each(['direction', 'entity', 'layout', 'excluded'])('拒绝非法等高结构：%s', scenario => {
    const input = source();
    const invalid: IRFlowDiagram = {
      ...input,
      entities: [
        ...input.entities,
        ...(['entity', 'layout'].includes(scenario) ? [{ id: 'extra', text: 'Extra' }] : []),
      ],
      layouts: [
        ...input.layouts!,
        ...(scenario === 'layout'
          ? [{ id: 'extra-layout', kind: 'linear' as const, direction: 'down' as const, children: ['extra'] }]
          : []),
      ].map(layout =>
        layout.id !== 'row' || layout.kind !== 'linear'
          ? layout
          : {
              ...layout,
              ...(scenario === 'direction' ? { direction: 'down' as const } : {}),
              ...(scenario === 'entity' ? { children: ['short', 'tall', 'extra'] } : {}),
              ...(scenario === 'layout' ? { children: ['short', 'tall', 'extra-layout'] } : {}),
              ...(scenario === 'excluded' ? { excludeFromBounds: ['short'] } : {}),
            },
      ),
    };
    expect(() => compile(invalid)).toThrow('containerHeight');
  });

  it('节点宽度引起的折行进入等高计算，分组端点采用扩展后的外壳', () => {
    const input: IRFlowDiagram = {
      namespace: 'diagram',
      type: 'flow',
      entities: [
        { id: 'a', role: 'activity', text: 'Short' },
        { id: 'b', role: 'activity', text: 'Several words that wrap onto multiple lines' },
      ],
      groups: [
        { id: 'short', children: ['c1'] },
        { id: 'tall', children: ['c2'] },
      ],
      layouts: [
        {
          id: 'row',
          kind: 'linear',
          direction: 'right',
          containerHeight: 'match-largest',
          children: ['short', 'tall'],
        },
        { id: 'c1', kind: 'linear', direction: 'down', itemWidth: 120, children: ['a'] },
        { id: 'c2', kind: 'linear', direction: 'down', itemWidth: 120, children: ['b'] },
      ],
      children: ['row'],
      relations: [{ source: { id: 'short', anchor: 'bottom' }, target: { id: 'tall', anchor: 'bottom' } }],
    };
    const { row, artifact } = compile(input);
    const [short, tall] = row.elements;
    if (short.kind !== 'group' || tall.kind !== 'group') throw new Error('Expected groups');
    expect(short.bounds.height).toBeCloseTo(tall.bounds.height);
    expect(short.elements[0].bounds.height).toBeLessThan(tall.elements[0].bounds.height);
    const points = artifact.relations[0].route.points;
    expect(points[0][1]).toBeCloseTo(short.bounds.y + short.bounds.height);
    expect(points.at(-1)![1]).toBeCloseTo(tall.bounds.y + tall.bounds.height);
  });

  it('JSON 往返保留高度策略', () => {
    const parsed = FlowDiagramSchema.parse(source());
    expect(FlowDiagramSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
    expect(parsed.layouts[0]).toHaveProperty('containerHeight', 'match-largest');
  });

  it('自定义 provider 不能忽略分配高度', () => {
    const definition: FlowLayoutDefinition = {
      ...layeredFlowLayoutDefinition,
      name: 'violates-height',
      layout: (input, context) => {
        const output = layeredFlowLayoutDefinition.layout(input, context);
        return {
          ...output,
          elements: output.elements.map(element =>
            element.id === 'short'
              ? { ...element, bounds: { ...element.bounds, height: element.bounds.height - 5 } }
              : element,
          ),
        };
      },
    };
    expect(() => compile(source(), definition)).toThrow('allocated height');
  });
});
