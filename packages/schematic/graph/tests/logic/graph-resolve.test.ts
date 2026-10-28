import { DEFAULT_RESOLVED_THEME } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import * as Graph from '../../src';

const entity = (id: string, input: Record<string, unknown> = {}) => ({
  namespace: 'graph' as const,
  type: 'entity' as const,
  id,
  role: 'activity',
  position: [0, 0] as const,
  ...input,
});

const relation = (id: string, group?: string, input: Record<string, unknown> = {}) => ({
  namespace: 'graph' as const,
  type: 'relation' as const,
  id,
  source: { id: `${id}-source` },
  target: { id: `${id}-target` },
  role: 'flow',
  ...(group === undefined ? {} : { group }),
  ...input,
});

describe('Graph 上下文投影', () => {
  it('在投影 Entity 和 Relation 上下文时保留任意 Core 子顺序', () => {
    const source = Graph.GraphSchema.parse({
      namespace: 'graph',
      type: 'graph',
      graphRules: [
        { type: 'entity', style: { fill: '#ef4444' } },
        { type: 'relation', style: { stroke: '#2563eb' } },
      ],
      children: [
        { type: 'node', id: 'plain', position: [0, 0] },
        entity('service'),
        {
          namespace: 'graph',
          type: 'relation',
          source: { id: 'plain' },
          target: { id: 'service' },
          role: 'association',
        },
      ],
    });

    expect(Graph.resolveGraph(source, Graph.resolveGraphDefinitionOptions())).toEqual([
      { type: 'node', id: 'plain', position: [0, 0] },
      { ...entity('service'), style: { fill: '#ef4444' } },
      {
        namespace: 'graph',
        type: 'relation',
        source: { id: 'plain' },
        target: { id: 'service' },
        role: 'association',
        style: { stroke: '#2563eb' },
      },
    ]);
  });

  it('跨越普通 Scope，同时在 Core 主题边界保留 Graph 作者图层', () => {
    const source = Graph.GraphSchema.parse({
      namespace: 'graph',
      type: 'graph',
      graphRules: [{ type: 'entity', style: { fill: '#ef4444' } }],
      children: [
        { type: 'scope', children: [entity('inherited')] },
        { type: 'scope', theme: { mode: 'dark' }, children: [entity('reset')] },
      ],
    });
    const projected = Graph.resolveGraph(source, Graph.resolveGraphDefinitionOptions());

    expect(projected[0]).toMatchObject({
      type: 'scope',
      children: [{ id: 'inherited', style: { fill: '#ef4444' } }],
    });
    expect(projected[1]).toMatchObject({
      type: 'scope',
      theme: { mode: 'dark' },
      children: [{ id: 'reset', style: { fill: '#ef4444' } }],
    });
    expect((projected[1] as { children: Array<Record<string, unknown>> }).children[0]).toHaveProperty(
      'style.fill',
      '#ef4444',
    );
  });

  it('合并嵌套的 Graph 上下文，并使第三方复合有效负载不透明', () => {
    const opaque = {
      namespace: 'custom',
      type: 'opaque',
      payload: entity('hidden'),
    } as const;
    const source = Graph.GraphSchema.parse({
      namespace: 'graph',
      type: 'graph',
      graphRules: [{ type: 'entity', style: { opacity: 0.5 } }],
      children: [
        opaque,
        {
          namespace: 'graph',
          type: 'graph',
          graphRules: [{ type: 'entity', style: { fill: '#22c55e' } }],
          children: [entity('nested', { style: { fill: '#ffffff' } })],
        },
      ],
    });
    const projected = Graph.resolveGraph(source, Graph.resolveGraphDefinitionOptions());

    expect(projected[0]).toEqual(opaque);
    expect(projected[1]).toMatchObject({
      namespace: 'graph',
      type: 'graph',
      children: [{ id: 'nested', style: { opacity: { overall: 0.5 }, fill: '#ffffff' } }],
    });
  });

  it('让内部 Graph 默认值高于外部 Graph 规则', () => {
    const source = Graph.GraphSchema.parse({
      namespace: 'graph',
      type: 'graph',
      graphRules: [{ type: 'entity', style: { fill: '#ef4444' } }],
      children: [
        {
          namespace: 'graph',
          type: 'graph',
          defaultGraph: { entity: { style: { fill: '#2563eb' } } },
          children: [entity('nested')],
        },
      ],
    });
    const projected = Graph.resolveGraph(source, Graph.resolveGraphDefinitionOptions());

    expect(projected[0]).toMatchObject({
      namespace: 'graph',
      type: 'graph',
      children: [{ id: 'nested', style: { fill: '#2563eb' } }],
    });
  });

  it('从分类调色板头分配 Entity 和 Relation 组稳定颜色', () => {
    const source = Graph.GraphSchema.parse({
      namespace: 'graph',
      type: 'graph',
      children: [
        entity('local-point', { group: 'forward' }),
        relation('forward-first', 'forward'),
        { type: 'scope', children: [relation('reverse', 'reverse')] },
        {
          namespace: 'graph',
          type: 'group',
          id: 'nested',
          children: [entity('world-point', { group: 'reverse' }), relation('forward-second', 'forward')],
        },
        relation('neutral'),
      ],
    });

    const projected = Graph.resolveGraph(source, Graph.resolveGraphDefinitionOptions(), DEFAULT_RESOLVED_THEME);
    const palette = DEFAULT_RESOLVED_THEME.colors.categorical;

    expect(projected[0]).toMatchObject({
      style: { color: palette.at(0) },
    });
    expect(projected[1]).toMatchObject({
      style: { color: palette.at(0) },
      sourceMarker: { color: palette.at(0) },
      targetMarker: { color: palette.at(0) },
    });
    expect(projected[2]).toHaveProperty('children.0.style.color', palette.at(1));
    expect(projected[3]).toHaveProperty('children.0.style.color', palette.at(1));
    expect(projected[3]).toHaveProperty('children.1.style.color', palette.at(0));
    expect(projected[4]).not.toHaveProperty('style');
  });

  it('将规则、显式路径和标记颜色保留在 Relation 组回退之上', () => {
    const source = Graph.GraphSchema.parse({
      namespace: 'graph',
      type: 'graph',
      graphRules: [{ type: 'relation', selector: { status: 'warning' }, style: { color: '#f97316' } }],
      children: [
        relation('rule', 'forward', { status: 'warning' }),
        relation('explicit-color', 'forward', { style: { color: '#16a34a' } }),
        relation('explicit-stroke', 'forward', { style: { stroke: '#2563eb' } }),
        relation('marker', 'forward', { sourceMarker: { color: '#a855f7' } }),
      ],
    });

    const projected = Graph.resolveGraph(source, Graph.resolveGraphDefinitionOptions(), DEFAULT_RESOLVED_THEME);
    const paletteColor = DEFAULT_RESOLVED_THEME.colors.categorical.at(0);

    expect(projected[0]).toMatchObject({ style: { color: '#f97316' } });
    expect(projected[1]).toMatchObject({ style: { color: '#16a34a' } });
    expect(projected[2]).toMatchObject({ style: { stroke: '#2563eb' } });
    expect(projected[3]).toMatchObject({
      style: { color: paletteColor },
      sourceMarker: { color: '#a855f7' },
      targetMarker: { color: paletteColor },
    });
  });

  it('当其外观明确时，保留 Entity 组颜色槽', () => {
    const source = Graph.GraphSchema.parse({
      namespace: 'graph',
      type: 'graph',
      children: [
        entity('explicit', { group: 'explicit', style: { color: '#16a34a' } }),
        entity('automatic', { group: 'automatic' }),
      ],
    });

    const projected = Graph.resolveGraph(source, Graph.resolveGraphDefinitionOptions(), DEFAULT_RESOLVED_THEME);

    expect(projected[0]).toMatchObject({ style: { color: '#16a34a' } });
    expect(projected[1]).toMatchObject({ style: { color: DEFAULT_RESOLVED_THEME.colors.categorical.at(1) } });
  });
});
