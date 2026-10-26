import { describe, expect, it } from 'vitest';

import { FlowDiagramSchema, FlowRoutingSchema } from '../../src/flow';

describe('Flow 折弯编写', () => {
  it('通过 JSON 保留省略的方向和不活动的编写字段', () => {
    expect(FlowRoutingSchema.parse({ kind: 'bend' })).toEqual({ kind: 'bend' });

    const authored = { kind: 'bend', bendDirection: 'right', bendAngle: 0, outAngle: 45, looseness: 2 };

    expect(FlowRoutingSchema.parse(JSON.parse(JSON.stringify(authored)))).toEqual(authored);
  });

  it.each([-180, 180, Infinity])('拒绝其场内无效的弯曲角度 %s', bendAngle => {
    const parsed = FlowRoutingSchema.safeParse({ kind: 'bend', bendAngle });

    expect(parsed.success).toBe(false);

    if (!parsed.success) {
      const issues = parsed.error.issues.flatMap(issue =>
        issue.code === 'invalid_union' ? issue.errors.flat() : [issue],
      );

      expect(issues.some(issue => issue.path.join('.') === 'bendAngle')).toBe(true);
    }
  });
});

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
  defaultFlow: {
    layout: { nodeGap: 16, rankGap: 32 },
    entity: { style: { fill: '#ffffff', opacity: 0.95 }, layout: { minimumSize: 48, margin: 4 } },
    group: { padding: 12 },
    relation: { style: { strokeWidth: 2, opacity: { stroke: 0.8 } } },
  },
} as const;

describe('Flow Source 的 schema', () => {
  it('默认省略的目录为空数组，同时保留所需的成员', () => {
    const source = {
      namespace: 'diagram',
      type: 'flow',
      entities: [{ id: 'item', text: 'Item' }],
      children: ['item'],
    };
    expect(FlowDiagramSchema.parse(source)).toEqual({ ...source, position: [0, 0], groups: [], layouts: [] });
    expect(FlowDiagramSchema.safeParse({ ...source, entities: [] }).success).toBe(false);
    expect(FlowDiagramSchema.safeParse({ ...source, children: [] }).success).toBe(false);
  });

  it('保留根规则和 Group 本地 Graph 规则', () => {
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
    ).toBe(true);
  });

  it('往返 Flow Relation 组并拒绝非字符串组', () => {
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

    expect(JSON.parse(JSON.stringify(parsed))).toEqual({ ...source, position: [0, 0] });
    expect(
      FlowDiagramSchema.safeParse({
        ...source,
        relations: [{ source: 'source', target: 'target', group: 1 }],
      }).success,
    ).toBe(false);
  });

  it('解析平面目录 Source 并往返而不改变它', () => {
    const parsed = FlowDiagramSchema.parse(completeFlow);

    expect(parsed).toEqual({ ...completeFlow, position: [0, 0] });
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
    expect(Object.keys(parsed).at(-1)).toBe('children');
    expect(JSON.stringify(parsed)).not.toContain('parentId');
    expect(JSON.stringify(parsed)).not.toContain('members');
  });

  it('接受所需的空组，同时保持实体和每个子列表非空', () => {
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

  it('接受 Core 兼容的多行 Entity 文本，不带元素类型判别字段', () => {
    const text = [
      'Frontend form',
      { text: 'Complete user details', fill: 'gray', font: { size: 'sm' } },
      { segments: [{ text: 'Field ' }, { tex: 'x' }] },
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

  it('接受非空白 Core TextBlock 作为 Relation 标签', () => {
    const label = ['编译', { text: '生成 Scene', fill: 'gray' }];
    const parsed = FlowDiagramSchema.parse({
      namespace: 'diagram',
      type: 'flow',
      entities: [
        { id: 'source', text: 'Source' },
        { id: 'target', text: 'Target' },
      ],
      groups: [],
      layouts: [],
      children: ['source', 'target'],
      relations: [{ source: 'source', target: 'target', label }],
    });

    expect(parsed.relations?.[0]?.label).toEqual(label);
  });

  it('保持 Group 可见，并为 Layout 提供单独的封闭 schema', () => {
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

    expect(FlowDiagramSchema.parse(source)).toEqual({ ...source, position: [0, 0] });
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

  it('接受直接 Entity 项宽度策略并拒绝无效值', () => {
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

    expect(FlowDiagramSchema.parse(source)).toEqual({ ...source, position: [0, 0] });
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
  ])('拒绝非 Graph 状态值：%j', ({ entityStatus, relationStatus }) => {
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
  ])('拒绝冗余的 Flow 关系标识字段：%j', relation => {
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
    { ...completeFlow, entities: [{ id: 'blank-segments', text: [{ segments: [{ text: ' ' }, { tex: ' ' }] }] }] },
    { ...completeFlow, entities: [{ id: 'negative-rank', text: 'x', rank: -1 }] },
    { ...completeFlow, flowTheme: {} },
    { ...completeFlow, flowThemeTokens: {} },
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
  ])('拒绝非规范、空或无效的 Source 输入：%j', input => {
    expect(FlowDiagramSchema.safeParse(input).success).toBe(false);
  });

  it.each([
    { id: 'position', text: 'x', position: [0, 0] },
    { id: 'shape', text: 'x', style: { shape: 'circle' } },
    { id: 'padding', text: 'x', style: { padding: 8 } },
    { id: 'boundary', text: 'x', style: { boundary: 'rectangle' } },
  ])('拒绝 Entity 声明上的 Graph 几何图形：%j', entity => {
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

  it('拒绝不受支持的 Flow Block 声明', () => {
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
  ])('拒绝根关系上仅 Graph 的路由和标记配方字段：%j', relation => {
    expect(FlowDiagramSchema.safeParse({ ...completeFlow, relations: [relation] }).success).toBe(false);
  });

  it.each([
    { entity: { style: { shape: 'circle' } } },
    { block: { layout: { minWidth: 160 } } },
    { relation: { targetMarker: { shape: 'stealth' } } },
    { layout: { nodeGap: -1 } },
    { layout: { direction: 'right' } },
    { relation: { routing: { kind: 'straight' } } },
  ])('拒绝结构性或无效的 Flow 默认值：%j', defaultFlow => {
    expect(FlowDiagramSchema.safeParse({ ...completeFlow, defaultFlow }).success).toBe(false);
  });

  it('拒绝不支持的结构化 Flow Block 主题切片', () => {
    expect(
      FlowDiagramSchema.safeParse({
        namespace: 'diagram',
        type: 'flow',
        entities: [{ id: 'entity', text: 'Entity' }],
        groups: [],
        layouts: [],
        children: ['entity'],
        defaultFlow: { block: { layout: { minWidth: 160 } } },
      }).success,
    ).toBe(false);
  });
});
