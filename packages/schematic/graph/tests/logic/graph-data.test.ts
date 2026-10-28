import { describe, expect, it } from 'vitest';
import type { ZodType } from 'zod';

import * as Graph from '../../src';

const publicSchema = (name: string): ZodType => {
  const schema = (Graph as Record<string, unknown>)[name];

  expect(schema, `missing public schema ${name}`).toBeDefined();
  return schema as ZodType;
};

const entity = {
  namespace: 'graph',
  type: 'entity',
  id: 'service',
  role: 'participant',
  kind: 'architecture.service',
  predicate: { name: 'deployment', params: { replicas: 2 } },
  position: [20, 30],
  text: 'API',
  zIndex: 1,
  meta: { source: 'catalog' },
  layout: { minimumSize: { width: 72, height: 36 } },
} as const;

const relation = {
  namespace: 'graph',
  type: 'relation',
  source: { id: 'service', anchor: { side: 'right', fraction: 0.5 }, offset: [2, -1], boundary: 'shape' },
  target: { id: 'database', anchor: 'west' },
  role: 'dependency',
  kind: 'architecture.runtime',
  predicate: { name: 'traffic', params: { protocol: 'https' } },
  direction: 'forward',
  labels: [{ text: 'reads', position: 'midway', side: 'top' }],
  route: [
    { type: 'step', kind: 'move', to: { id: 'service' } },
    { type: 'step', kind: 'line', to: { id: 'database' } },
  ],
  cornerRadius: 4,
  zIndex: 2,
  meta: { source: 'catalog' },
} as const;

const graph = {
  namespace: 'graph',
  type: 'graph',
  id: 'architecture',
  theme: { mode: 'dark' },
  graphRules: [{ type: 'entity', selector: { role: 'participant' }, style: { fill: '#eef6ff' } }],
  localNamespace: true,
  transforms: [{ kind: 'translate', x: 10, y: 20 }],
  position: { kind: 'anchor', target: [30, 40], selfAnchor: 'center' },
  zIndex: 2,
  clip: { kind: 'rect', params: { x: 0, y: 0, width: 220, height: 120 } },
  boundingShape: 'circle',
  animations: [],
  children: [
    entity,
    { namespace: 'graph', type: 'entity', id: 'database', role: 'resource', position: [160, 30] },
    relation,
    { type: 'scope', position: [0, 0], children: [{ type: 'node', position: [0, 0], text: 'Legend' }] },
  ],
  meta: { source: 'architecture-catalog' },
  defaults: {
    style: { fill: 'lightblue', opacity: 0.8 },
    reset: ['path'],
    node: { style: { fill: 'white' }, label: { font: { size: 10 } } },
    path: { style: { stroke: 'green' }, label: { font: { size: 10 } }, arrow: { shape: 'stealth', scale: 1.5 } },
  },
} as const;

describe('Graph Source 数据组装', () => {
  it('往返一个严格的 Graph，其成员直接拥有面向下的字段', () => {
    const parsed = publicSchema('GraphSchema').parse(graph);

    expect(JSON.parse(JSON.stringify(parsed))).toEqual(graph);
    expect(() => publicSchema('GraphSchema').parse({ ...graph, presentation: {} })).toThrow();
    expect(() => publicSchema('GraphSchema').parse({ ...graph, geometry: {} })).toThrow();
    expect(() => publicSchema('GraphSchema').parse({ ...graph, registry: {} })).toThrow();
    expect(() => publicSchema('GraphSchema').parse({ ...graph, meta: { invalid: () => 'not JSON' } })).toThrow();
  });

  it('使用完整的 Core 子语法，没有 Graph 拥有的重复预验证', () => {
    const duplicate = { type: 'node', id: 'service', position: [240, 30] } as const;
    const thirdParty = { namespace: 'custom', type: 'badge', payload: { text: 'external' } } as const;
    const parsed = publicSchema('GraphSchema').parse({
      ...graph,
      children: [...graph.children, duplicate, thirdParty],
    }) as typeof graph;

    expect(parsed.children.at(-2)).toEqual(duplicate);
    expect(parsed.children.at(-1)).toEqual(thirdParty);
  });

  it('将 Core 主题和 Graph 本地规则保留在不相交的字段中', () => {
    const schema = publicSchema('GraphSchema');

    expect(schema.parse(graph)).toMatchObject({ theme: { mode: 'dark' }, graphRules: graph.graphRules });
    expect(() => schema.parse({ ...graph, theme: graph.graphRules, graphRules: undefined })).toThrow();
    expect(() =>
      schema.parse({ ...graph, theme: undefined, graphRules: [{ type: 'entity', mode: 'dark' }] }),
    ).toThrow();
  });

  it('严格拒绝 Source 和主题选择器中删除的 Variant 字段', () => {
    expect(() => publicSchema('GraphSchema').parse({ ...graph, entityVariant: 'fill' })).toThrow();
    expect(() => publicSchema('EntitySchema').parse({ ...entity, variant: 'mixed' })).toThrow();
    expect(() => publicSchema('RelationSchema').parse({ ...relation, variant: 'default' })).toThrow();
    expect(() =>
      publicSchema('GraphEntityThemeSelectorSchema').parse({ role: 'participant', variant: 'fill' }),
    ).toThrow();
    expect(() =>
      publicSchema('GraphRelationThemeSelectorSchema').parse({ role: 'dependency', variant: 'default' }),
    ).toThrow();
  });

  it('接受非结构 Core Node 曲面，同时拒绝角色拥有的结构', () => {
    const schema = publicSchema('EntitySchema');
    const nonStructuralEntity = {
      ...entity,
      style: {
        color: '#334155',
        fill: '#e2e8f0',
        stroke: '#475569',
        strokeWidth: 2,
        dashed: true,
        dotted: false,
        dashPattern: [6, 2],
        dashOffset: -1,
        textColor: '#0f172a',
        shadow: 'sm',
        blendMode: 'multiply',
        opacity: { fill: 0.8, stroke: 0.7, overall: 0.9 },
      },
    } as const;

    expect(schema.parse(nonStructuralEntity)).toEqual(nonStructuralEntity);
    expect(() => schema.parse({ ...entity, shape: 'rectangle' })).toThrow();
    expect(() => schema.parse({ ...entity, boundary: 'rectangle' })).toThrow();
    expect(() => schema.parse({ ...entity, padding: 8 })).toThrow();
    expect(() => schema.parse({ ...entity, cornerRadius: 8 })).toThrow();
  });

  it('拒绝已删除的 Entity 端口并重新使用完整的 Core NodeTarget 端点', () => {
    const entitySchema = publicSchema('EntitySchema');
    const relationSchema = publicSchema('RelationSchema');

    expect(() => entitySchema.parse({ ...entity, ports: [{ id: 'api' }] })).toThrow();
    expect(relationSchema.parse(relation)).toMatchObject({ source: relation.source, target: relation.target });
    expect(() => relationSchema.parse({ ...relation, source: { entity: 'service' } })).toThrow();
  });

  it('重复使用不冲突的 Core Path 表面和完整的几何标签', () => {
    const schema = publicSchema('RelationSchema');
    const pathCompatibleRelation = {
      ...relation,
      style: {
        color: '#334155',
        stroke: '#475569',
        strokeWidth: 2,
        shadow: 'sm',
        blendMode: 'multiply',
        dashPattern: [6, 2],
        dashOffset: -1,
        lineCap: 'round',
        lineJoin: 'bevel',
        opacity: { stroke: 0.7, overall: 0.9 },
      },
      rotate: 10,
      scale: { x: 1.2, y: 0.8 },
      animations: [],
      labels: [
        { text: 'reads', position: 'midway', side: 'top' },
        {
          text: 'precise',
          position: 0.75,
          textColor: '#ffffff',
          opacity: 0.6,
          font: { size: 14, weight: 'bold' },
        },
      ],
    } as const;

    expect(schema.parse(pathCompatibleRelation)).toEqual(pathCompatibleRelation);
    expect(() => schema.parse({ ...relation, children: relation.route })).toThrow();
    expect(() => schema.parse({ ...relation, kindOptions: {} })).toThrow();
    expect(() => schema.parse({ ...relation, fill: '#fff' })).toThrow();
    expect(() => schema.parse({ ...relation, fillOpacity: 0.5 })).toThrow();
    expect(() => schema.parse({ ...relation, fillRule: 'evenodd' })).toThrow();
    expect(() => schema.parse({ ...relation, marks: [] })).toThrow();
    expect(() =>
      schema.parse({
        ...relation,
        route: [relation.route[0], { ...relation.route[1], label: { text: 'hidden style' } }],
      }),
    ).toThrow();
  });

  it('保留 JSON 安全的 Relation 颜色组，同时拒绝非字符串值', () => {
    const schema = publicSchema('RelationSchema');
    const groupedRelation = { ...relation, group: '' } as const;

    const parsed = schema.parse(groupedRelation);

    expect(parsed).toEqual(groupedRelation);
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(groupedRelation);
    expect(() => schema.parse({ ...relation, group: 1 })).toThrow();
  });

  it('保留 JSON 安全的 Entity 颜色组，同时拒绝非字符串值', () => {
    const schema = publicSchema('EntitySchema');
    const groupedEntity = { ...entity, group: 'coordinate-chain' } as const;

    const parsed = schema.parse(groupedEntity);

    expect(parsed).toEqual(groupedEntity);
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(groupedEntity);
    expect(() => schema.parse({ ...entity, group: 1 })).toThrow();
  });

  it('将 Relation 结构与主题拥有的外观分开', () => {
    const relationRole = publicSchema('GraphRelationRoleTokenRecipeSchema');
    const relationStructure = publicSchema('GraphRelationStructureTokenOverridesSchema');
    const relationAppearance = publicSchema('GraphRelationDefaultsSchema');

    expect(relationRole.parse({ sourceMarker: false, targetMarker: { shape: 'kite' }, dashPattern: false })).toEqual({
      sourceMarker: false,
      targetMarker: { shape: 'kite' },
      dashPattern: false,
    });
    expect(relationStructure.parse({ targetMarker: { shape: 'openKite' } })).toEqual({
      targetMarker: { shape: 'openKite' },
    });
    expect(relationAppearance.parse({ style: { opacity: 0.8 }, targetMarker: { fill: 'currentColor' } })).toEqual({
      style: { opacity: 0.8 },
      targetMarker: { fill: 'currentColor' },
    });
    expect(() =>
      relationRole.parse({ sourceMarker: false, targetMarker: false, dashPattern: false, appearance: {} }),
    ).toThrow();
    expect(() => relationAppearance.parse({ dashPattern: [4, 2] })).toThrow();
  });

  it('只要 Core 子项有效，就允许 Graph 语义组合', () => {
    const parsed = publicSchema('GraphSchema').parse({
      namespace: 'graph',
      type: 'graph',
      children: [{ type: 'scope', children: [entity, relation] }],
    });

    expect(parsed).toEqual({
      namespace: 'graph',
      type: 'graph',
      position: [0, 0],
      children: [{ type: 'scope', position: [0, 0], children: [entity, relation] }],
    });
  });
});
