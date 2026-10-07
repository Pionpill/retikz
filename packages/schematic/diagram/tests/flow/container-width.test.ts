import type { ScenePrimitive } from '@retikz/core';
import { compileToScene, defineThemeStyle, resolveCoreProviderDependencies } from '@retikz/core';
import { defineGraphThemeStyle } from '@retikz/graph';
import { describe, expect, it } from 'vitest';

import { defineDiagramThemeStyle } from '../../src/_diagram';
import type { FlowLayoutDefinition } from '../../src/flow';
import { defineFlowThemeStyle, LayeredFlowLayoutDefinition } from '../../src/flow';
import { FlowDiagramSchema, FlowDiagramArtifactSchema, createFlowDiagramProviderContribution } from '../../src/flow';

const source = (fill = true, fixed = false) => ({
  namespace: 'diagram',
  type: 'flow',
  entities: [
    { id: 'a', text: 'A', role: 'activity', ...(fixed ? { layout: { width: 90 } } : {}) },
    { id: 'b', text: 'BB', role: 'activity' },
    { id: 'c', text: 'Much longer text', role: 'activity' },
    { id: 'd', text: 'DDD', role: 'activity' },
  ],
  groups: [],
  layouts: [
    {
      id: 'rows',
      kind: 'linear',
      direction: 'down',
      ...(fill ? { containerWidth: 'match-largest' } : {}),
      children: ['r1', 'r2'],
    },
    {
      id: 'r1',
      kind: 'linear',
      direction: 'right',
      ...(fill ? { itemWidth: 'fill' } : {}),
      gap: 30,
      children: ['a', 'b'],
    },
    {
      id: 'r2',
      kind: 'linear',
      direction: 'right',
      ...(fill ? { itemWidth: 'fill' } : {}),
      gap: 30,
      children: ['c', 'd'],
    },
  ],
  children: ['rows'],
  relations: [
    { source: 'a', target: 'b' },
    { source: 'c', target: 'd' },
  ],
});

const compile = (input: unknown) => {
  const result = compileToScene(
    { type: 'scene', version: 1, children: [FlowDiagramSchema.parse(input)] },
    {
      ...resolveCoreProviderDependencies({ contributions: [createFlowDiagramProviderContribution()] }),
      measureText: text => ({ width: text.length * 8, height: 12, ascent: 9, descent: 3 }),
    },
  );
  const artifact = FlowDiagramArtifactSchema.parse(
    result.artifacts.find(item => item.kind === 'composite' && item.namespace === 'diagram')?.value,
  );
  const root = artifact.elements[0];
  if (root.kind !== 'layout') throw new Error('Expected layout');

  const first = root.elements[0];
  const second = root.elements[1];
  if (first.kind !== 'layout' || second.kind !== 'layout') throw new Error('Expected rows');

  return { first, second };
};

describe('Flow 容器宽度', () => {
  it('局部主题改变字号时，测量与最终外框仍保持行等宽', () => {
    const name = 'compact';
    const result = compileToScene(
      { type: 'scene', version: 1, children: [FlowDiagramSchema.parse({ ...source(), theme: { style: name } })] },
      {
        ...resolveCoreProviderDependencies({
          contributions: [
            createFlowDiagramProviderContribution({
              graphThemeStyles: [
                defineGraphThemeStyle({
                  name,
                  resolve: () => ({ defaults: { entity: { style: { font: { size: 14 } } } } }),
                }),
              ],
              flowThemeStyles: [defineFlowThemeStyle({ name, resolve: () => ({}) })],
              diagramThemeStyles: [defineDiagramThemeStyle({ name, resolve: () => ({}) })],
            }),
          ],
        }),
        themeStyles: [defineThemeStyle({ name, resolve: () => ({}) })],
        measureText: (text, font) => ({
          width: (text.length * font.size) / 2,
          height: font.size,
          ascent: font.size * 0.8,
          descent: font.size * 0.2,
        }),
      },
    );
    const artifact = FlowDiagramArtifactSchema.parse(
      result.artifacts.find(item => item.kind === 'composite' && item.namespace === 'diagram')?.value,
    );
    const root = artifact.elements[0];
    if (root.kind !== 'layout') throw new Error('Expected layout');
    const [first, second] = root.elements;
    if (first.kind !== 'layout' || second.kind !== 'layout') throw new Error('Expected rows');
    const rectangles = (items: ReadonlyArray<ScenePrimitive>): Array<Extract<ScenePrimitive, { type: 'rect' }>> =>
      items.flatMap(item => (item.type === 'group' ? rectangles(item.children) : item.type === 'rect' ? [item] : []));
    const rects = rectangles(result.scene.primitives);
    expect(rects).toHaveLength(4);
    const entities = [...first.elements, ...second.elements];
    rects.forEach((rect, index) => expect(rect.width).toBeCloseTo(entities[index].bounds.width, 2));
    expect(rects[0].x).toBeCloseTo(rects[2].x, 2);
    expect(rects[1].x + rects[1].width).toBeCloseTo(rects[3].x + rects[3].width, 2);
  });
  it('以自然最大行宽分配预算，节点均分增量且保留差异和间距', () => {
    const natural = compile(source(false));
    const filled = compile(source());

    expect(filled.first.bounds.width).toBeCloseTo(filled.second.bounds.width);
    expect(filled.second.bounds.width).toBeCloseTo(natural.second.bounds.width);

    const delta = (natural.second.bounds.width - natural.first.bounds.width) / 2;

    for (let i = 0; i < 2; i++)
      expect(filled.first.elements[i].bounds.width).toBeCloseTo(natural.first.elements[i].bounds.width + delta);

    expect(
      filled.first.elements[1].bounds.x - filled.first.elements[0].bounds.x - filled.first.elements[0].bounds.width,
    ).toBeCloseTo(30);
  });

  it('固定宽度节点不接收增量', () => {
    const result = compile(source(true, true));

    expect(result.first.elements[0].bounds.width).toBeCloseTo(
      compile(source(false, true)).first.elements[0].bounds.width,
    );
    expect(result.first.bounds.width).toBeCloseTo(result.second.bounds.width);
  });

  it('缺少分配父级时拒绝 fill', () => {
    const input = source(false);
    input.layouts = input.layouts.map((row, index) => (index === 1 ? { ...row, itemWidth: 'fill' } : row));

    expect(() => compile(input)).toThrow();
  });

  it('拒绝横向父容器的等宽约束', () => {
    const input = source();
    input.layouts[0].direction = 'right';

    expect(() => compile(input)).toThrow();
  });

  it('只有外框等宽时保留内部自然尺寸', () => {
    const input = source();
    if ('itemWidth' in input.layouts[1]) delete input.layouts[1].itemWidth;
    if ('itemWidth' in input.layouts[2]) delete input.layouts[2].itemWidth;
    const natural = compile(source(false));
    const result = compile(input);

    expect(result.first.bounds.width).toBeCloseTo(result.second.bounds.width);
    expect(result.first.elements[0].bounds.width).toBeCloseTo(natural.first.elements[0].bounds.width);
  });
});

describe('Flow 容器宽度边界', () => {
  it('三个节点均分增量，保留各自 margin 与行 gap', () => {
    const make = (fill: boolean) => {
      const input = source(fill);
      return {
        ...input,
        entities: [
          ...input.entities.map(entity => ({ ...entity, layout: { margin: { left: 3, right: 7 } } })),
          { id: 'e', text: 'E', role: 'activity' },
        ],
        layouts: input.layouts.map(row => (row.id === 'r1' ? { ...row, gap: 4, children: ['a', 'b', 'e'] } : row)),
      };
    };

    const before = compile(make(false));
    const after = compile(make(true));
    const delta = (before.second.bounds.width - before.first.bounds.width) / 3;

    expect(delta).toBeGreaterThan(0);

    for (let index = 0; index < 3; index++)
      expect(after.first.elements[index].bounds.width - before.first.elements[index].bounds.width).toBeCloseTo(delta);

    expect(after.first.bounds.width).toBeCloseTo(after.second.bounds.width);
  });

  it('默认配置中的固定宽度也不参与伸展', () => {
    const input = source();

    expect(() =>
      compile({
        ...input,
        flowDefaults: { entity: { layout: { width: 180 } } },
        layouts: input.layouts.map(row => (row.id === 'r2' ? { ...row, gap: 80 } : row)),
      }),
    ).toThrow('Positive free width requires a non-fixed Entity');
  });

  it('拒绝拥有多个内容根的 Group', () => {
    const input = source();

    expect(() =>
      compile({
        ...input,
        groups: [{ id: 'g', children: ['r1', 'r2'] }],
        layouts: input.layouts.map(row => (row.id === 'rows' ? { ...row, children: ['g'] } : row)),
      }),
    ).toThrow('exactly one such content root');
  });

  it('Group 以外壳预算等宽，扣除 inset 后交给唯一内容行', () => {
    const input = source();
    input.layouts[0].children = ['g1', 'g2'];
    const result = compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [
          FlowDiagramSchema.parse({
            ...input,
            groups: [
              { id: 'g1', children: ['r1'], caption: { title: { text: 'A very long group title' } }, padding: 18 },
              { id: 'g2', children: ['r2'], caption: { title: { text: 'Group' } }, padding: 10 },
            ],
          }),
        ],
      },
      resolveCoreProviderDependencies({ contributions: [createFlowDiagramProviderContribution()] }),
    );
    const artifact = FlowDiagramArtifactSchema.parse(
      result.artifacts.find(item => item.kind === 'composite' && item.namespace === 'diagram')?.value,
    );
    const root = artifact.elements[0];
    if (root.kind !== 'layout') throw new Error('Expected Layout');

    const [first, second] = root.elements;

    expect(first.bounds.width).toBeCloseTo(second.bounds.width);

    if (first.kind !== 'group' || second.kind !== 'group') throw new Error('Expected Groups');

    expect(first.elements[0].bounds.width).toBeLessThan(first.bounds.width);
    expect(second.elements[0].bounds.width).toBeLessThan(second.bounds.width);
  });

  it('整行固定且需要增长时失败', () => {
    const input = source(true, true);
    input.entities[1] = { ...input.entities[1], layout: { width: 35 } };

    expect(() => compile(input)).toThrow();
  });

  it('排除边界贡献的行不能同时消费父级宽度', () => {
    const input = source();

    expect(() =>
      compile({
        ...input,
        layouts: input.layouts.map((row, index) => (index === 1 ? { ...row, excludeFromBounds: ['a'] } : row)),
      }),
    ).toThrow();
  });

  it('反向横排行保持同一等宽结果', () => {
    const input = source();
    input.layouts[1].direction = 'left';
    input.layouts[2].direction = 'left';
    const result = compile(input);

    expect(result.first.bounds.width).toBeCloseTo(result.second.bounds.width);
    expect(result.first.elements[0].bounds.x).toBeGreaterThan(result.first.elements[1].bounds.x);
  });

  it('长关系标签的预留空间参与自然宽度，最终间距不被再次扩大', () => {
    const input = source();
    const natural = source(false);
    const relations = [
      { source: 'a', target: 'b', label: 'A long edge label' },
      { source: 'c', target: 'd' },
    ];
    const before = compile({ ...natural, relations });
    const after = compile({ ...input, relations });

    expect(after.first.bounds.width).toBeCloseTo(after.second.bounds.width);
    expect(after.first.bounds.width).toBeCloseTo(Math.max(before.first.bounds.width, before.second.bounds.width));
  });
});

it('自定义 provider 无法忽略已分配宽度', () => {
  const definition: FlowLayoutDefinition = {
    ...LayeredFlowLayoutDefinition,
    name: 'violates-width',
    layout: (input, context) => {
      const output = LayeredFlowLayoutDefinition.layout(input, context);
      return {
        ...output,
        elements: output.elements.map(element =>
          element.id === 'r1'
            ? { ...element, bounds: { ...element.bounds, width: element.bounds.width + 5 } }
            : element,
        ),
      };
    },
  };

  expect(() =>
    compileToScene(
      { type: 'scene', version: 1, children: [FlowDiagramSchema.parse(source())] },
      resolveCoreProviderDependencies({
        contributions: [
          createFlowDiagramProviderContribution({ flowLayouts: [definition], defaultFlowLayout: definition.name }),
        ],
      }),
    ),
  ).toThrow();
});

it('父级等宽不能掩盖接收行上的非法等宽声明', () => {
  const input = source();

  expect(() =>
    compile({
      ...input,
      layouts: input.layouts.map((row, index) => (index === 1 ? { ...row, containerWidth: 'match-largest' } : row)),
    }),
  ).toThrow();
});
