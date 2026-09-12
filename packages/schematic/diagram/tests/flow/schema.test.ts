import { describe, expect, it } from 'vitest';

import { FlowDiagramSchema } from '../../src/flow';

const completeFlow = {
  namespace: 'diagram',
  type: 'flow',
  id: 'ir-centric',
  entities: [
    {
      id: 'sugar',
      text: 'Sugar JSX',
      role: 'concept',
      kind: 'authoring',
      status: 'success',
      rank: 0,
      style: {
        fill: '#eff6ff',
        textColor: '#1e3a8a',
        font: { size: 14, weight: 600 },
      },
      layout: { align: 'middle', minimumSize: { width: 96, height: 40 }, margin: { x: 4, y: 2 } },
    },
    {
      id: 'ir',
      text: ['IR (JSON)', { text: 'Portable source', fill: 'gray' }],
      style: { fill: '#ffffff', stroke: '#94a3b8', font: { weight: 700 } },
      layout: { minimumSize: { width: 180, height: 48 } },
    },
  ],
  groups: [
    {
      id: 'compile',
      caption: { title: { text: 'Compile', textColor: '#334155', opacity: 0.9, font: { weight: 600 } } },
      rank: 1,
      layout: {
        direction: 'down',
        nodeGap: 12,
        rankGap: 24,
      },
      routing: { kind: 'orthogonal', cornerRadius: 6 },
      padding: 12,
      background: { fill: '#f8fafc' },
      border: { stroke: '#cbd5e1', strokeWidth: 1 },
      cornerRadius: 8,
      overflow: 'visible',

      children: ['pipeline'],
    },
  ],
  layouts: [{ kind: 'linear' as const, id: 'pipeline', direction: 'down', gap: 12, align: 'center', children: ['ir'] }],
  children: ['sugar', 'compile'],
  relations: [
    {
      source: 'sugar',
      target: 'ir',
      label: 'normalize',
      role: 'flow',
      kind: 'compile',
      status: 'warning',
      direction: 'forward',
      style: {
        stroke: '#475569',
        strokeWidth: 2,
        dashPattern: [4, 2],
      },
      targetMarker: { fill: '#475569', opacity: 1 },
      labelTextForeground: '#334155',
      routing: { kind: 'orthogonal', cornerRadius: 4 },
    },
  ],
  layout: { direction: 'right', nodeGap: 18 },
  routing: { kind: 'orthogonal', cornerRadius: 8 },
  flowDefaults: {
    layout: { nodeGap: 16, rankGap: 32 },
    entity: { style: { fill: '#ffffff', opacity: 0.95 }, layout: { minimumSize: 48, margin: 4 } },
    group: { padding: 12 },
    relation: { style: { strokeWidth: 2, strokeOpacity: 0.8 } },
  },
} as const;

describe('Flow Source schema', () => {
  it('preserves root Graph rules while rejecting Flow Group-local rules', () => {
    const source = {
      namespace: 'diagram',
      type: 'flow',
      graphRules: [{ type: 'entity', selector: { kind: 'docs.logic.important' }, style: { color: 'dodgerblue' } }],
      entities: [{ id: 'entity', text: 'Entity', kind: 'docs.logic.important' }],
      groups: [],
      layouts: [],
      children: ['entity'],
    };

    const parsed = FlowDiagramSchema.parse(source);

    expect(parsed.graphRules).toEqual(source.graphRules);
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
    expect(
      FlowDiagramSchema.safeParse({
        ...source,
        groups: [{ id: 'group', graphRules: source.graphRules, children: ['entity'] }],
        children: ['group'],
      }).success,
    ).toBe(false);
  });

  it('round-trips a Flow Relation group and rejects non-string groups', () => {
    const source = {
      namespace: 'diagram',
      type: 'flow',
      entities: [
        { id: 'source', text: 'Source' },
        { id: 'target', text: 'Target' },
      ],
      groups: [],
      layouts: [],
      children: ['source', 'target'],
      relations: [{ source: 'source', target: 'target', group: '' }],
    };

    const parsed = FlowDiagramSchema.parse(source);

    expect(JSON.parse(JSON.stringify(parsed))).toEqual(source);
    expect(
      FlowDiagramSchema.safeParse({
        ...source,
        relations: [{ source: 'source', target: 'target', group: 1 }],
      }).success,
    ).toBe(false);
  });

  it('parses the flat catalog Source and round-trips without changing it', () => {
    const parsed = FlowDiagramSchema.parse(completeFlow);

    expect(parsed).toEqual(completeFlow);
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
    expect(Object.keys(parsed).at(-1)).toBe('children');
    expect(JSON.stringify(parsed)).not.toContain('parentId');
    expect(JSON.stringify(parsed)).not.toContain('members');
  });

  it('accepts required empty groups while keeping entities and every children list non-empty', () => {
    const parsed = FlowDiagramSchema.parse({
      namespace: 'diagram',
      type: 'flow',
      entities: [{ id: 'only', text: 'Only' }],
      groups: [],
      layouts: [],
      children: ['only'],
    });

    expect(parsed.groups).toEqual([]);
  });

  it('accepts Core-compatible multi-line Entity text without an element type discriminator', () => {
    const text = [
      'Frontend form',
      { text: 'Complete user details', fill: 'gray', font: { size: 'sm' } },
      { runs: [{ text: 'Field ' }, { tex: 'x' }] },
    ];
    const parsed = FlowDiagramSchema.parse({
      namespace: 'diagram',
      type: 'flow',
      entities: [
        {
          id: 'form',
          text,
          layout: { align: 'start', lineHeight: 18, maxTextWidth: 160 },
        },
      ],
      groups: [],
      layouts: [],
      children: ['form'],
    });

    expect(parsed.entities[0]).toMatchObject({
      id: 'form',
      text,
      layout: { align: 'start', lineHeight: 18, maxTextWidth: 160 },
    });
  });

  it('keeps Group visible and gives Layout a separate closed schema', () => {
    const source = {
      namespace: 'diagram',
      type: 'flow',
      entities: [{ id: 'entity', text: 'Entity' }],
      groups: [],
      layouts: [
        { kind: 'linear' as const, id: 'layout', direction: 'left', gap: 8, align: 'end', children: ['entity'] },
      ],
      children: ['layout'],
    };

    expect(FlowDiagramSchema.parse(source)).toEqual(source);
    expect(
      FlowDiagramSchema.safeParse({
        ...source,
        layouts: [{ ...source.layouts[0], label: 'Not visible' }],
      }).success,
    ).toBe(false);
    expect(
      FlowDiagramSchema.safeParse({
        ...source,
        layouts: [{ ...source.layouts[0], style: { padding: 8 } }],
      }).success,
    ).toBe(false);
    expect(
      FlowDiagramSchema.safeParse({
        ...source,
        layouts: [{ kind: 'linear' as const, id: 'layout', children: ['entity'] }],
      }).success,
    ).toBe(false);
    expect(
      FlowDiagramSchema.safeParse({
        ...source,
        groups: [{ kind: 'visible', id: 'group', children: ['entity'] }],
        layouts: [],
        children: ['group'],
      }).success,
    ).toBe(false);
  });

  it('accepts direct-Entity item width strategies and rejects invalid values', () => {
    const source = {
      namespace: 'diagram',
      type: 'flow',
      entities: [{ id: 'entity', text: 'Entity', layout: { width: 80 } }],
      groups: [],
      layouts: [
        {
          kind: 'linear' as const,
          id: 'layout',
          direction: 'down',
          itemWidth: 'match-largest' as const,
          children: ['entity'],
        },
      ],
      children: ['layout'],
    };

    expect(FlowDiagramSchema.parse(source)).toEqual(source);
    expect(FlowDiagramSchema.safeParse({ ...source, layouts: [{ ...source.layouts[0], itemWidth: 0 }] }).success).toBe(
      false,
    );
    expect(
      FlowDiagramSchema.safeParse({ ...source, layouts: [{ ...source.layouts[0], itemWidth: 'largest' }] }).success,
    ).toBe(false);
  });

  it.each([
    { entityStatus: '', relationStatus: 'warning' },
    { entityStatus: 'planned', relationStatus: 'warning' },
    { entityStatus: 'success', relationStatus: 'planned' },
    { entityStatus: ['success'], relationStatus: 'warning' },
  ])('rejects non-Graph status values: %j', ({ entityStatus, relationStatus }) => {
    expect(
      FlowDiagramSchema.safeParse({
        ...completeFlow,
        entities: [{ id: 'entity', text: 'Entity', status: entityStatus }],
        groups: [],
        children: ['entity'],
        relations: [{ source: 'entity', target: 'entity', status: relationStatus }],
      }).success,
    ).toBe(false);
  });

  it.each([
    { type: 'relation', source: 'sugar', target: 'ir' },
    { id: 'sugar-to-ir', source: 'sugar', target: 'ir' },
  ])('rejects redundant Flow relation identity fields: %j', relation => {
    expect(FlowDiagramSchema.safeParse({ ...completeFlow, relations: [relation] }).success).toBe(false);
  });

  it.each([
    { ...completeFlow, unknown: true },
    { ...completeFlow, entities: [] },
    { ...completeFlow, children: [] },
    { ...completeFlow, layouts: [{ kind: 'linear' as const, id: 'empty', direction: 'right', children: [] }] },
    { ...completeFlow, relations: [] },
    { ...completeFlow, entities: [{ type: 'entity', id: 'typed', text: 'Typed' }] },
    { ...completeFlow, entities: [{ id: '', text: 'blank id' }] },
    { ...completeFlow, entities: [{ id: 'blank-text', text: '' }] },
    { ...completeFlow, entities: [{ id: 'blank-lines', text: ['', { text: ' ' }] }] },
    { ...completeFlow, entities: [{ id: 'blank-runs', text: [{ runs: [{ text: ' ' }, { tex: ' ' }] }] }] },
    { ...completeFlow, entities: [{ id: 'negative-rank', text: 'x', rank: -1 }] },
    { ...completeFlow, flowTheme: {} },
    { ...completeFlow, flowThemeTokens: {} },
    {
      namespace: 'diagram',
      type: 'flow',
      entities: [{ id: 'entity', text: 'Entity' }],
      children: ['entity'],
    },
    {
      namespace: 'diagram',
      type: 'flow',
      entities: [{ id: 'entity', text: 'Entity' }],
      groups: [],
      layouts: [],
    },
    {
      namespace: 'diagram',
      type: 'flow',
      elements: [{ type: 'entity', id: 'legacy', text: 'Legacy' }],
    },
  ])('rejects non-canonical, empty or invalid Source input: %j', input => {
    expect(FlowDiagramSchema.safeParse(input).success).toBe(false);
  });

  it.each([
    { id: 'position', text: 'x', position: [0, 0] },
    { id: 'shape', text: 'x', style: { shape: 'circle' } },
    { id: 'padding', text: 'x', style: { padding: 8 } },
    { id: 'boundary', text: 'x', style: { boundary: 'rectangle' } },
  ])('rejects Graph geometry on Entity declarations: %j', entity => {
    expect(
      FlowDiagramSchema.safeParse({
        namespace: 'diagram',
        type: 'flow',
        entities: [entity],
        groups: [],
        layouts: [],
        children: [entity.id],
      }).success,
    ).toBe(false);
  });

  it('rejects unsupported Flow Block declarations', () => {
    expect(
      FlowDiagramSchema.safeParse({
        namespace: 'diagram',
        type: 'flow',
        entities: [{ id: 'entity', text: 'Entity' }],
        groups: [],
        layouts: [],
        blocks: [{ id: 'block', title: { text: 'Block' } }],
        children: ['entity'],
      }).success,
    ).toBe(false);
  });

  it.each([
    {
      source: 'sugar',
      target: 'ir',
      route: [
        [0, 0],
        [10, 0],
      ],
    },
    {
      source: 'sugar',
      target: 'ir',
      targetMarker: { shape: 'stealth' },
    },
  ])('rejects Graph-only route and marker recipe fields on root relations: %j', relation => {
    expect(FlowDiagramSchema.safeParse({ ...completeFlow, relations: [relation] }).success).toBe(false);
  });

  it.each([
    { entity: { style: { shape: 'circle' } } },
    { block: { layout: { minWidth: 160 } } },
    { relation: { targetMarker: { shape: 'stealth' } } },
    { layout: { nodeGap: -1 } },
    { layout: { direction: 'right' } },
    { relation: { routing: { kind: 'straight' } } },
  ])('rejects structural or invalid Flow defaults: %j', flowDefaults => {
    expect(FlowDiagramSchema.safeParse({ ...completeFlow, flowDefaults }).success).toBe(false);
  });

  it('rejects the unsupported structured Flow Block theme slice', () => {
    expect(
      FlowDiagramSchema.safeParse({
        namespace: 'diagram',
        type: 'flow',
        entities: [{ id: 'entity', text: 'Entity' }],
        groups: [],
        layouts: [],
        children: ['entity'],
        flowDefaults: { block: { layout: { minWidth: 160 } } },
      }).success,
    ).toBe(false);
  });
});
