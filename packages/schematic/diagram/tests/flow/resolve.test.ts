import { DEFAULT_RESOLVED_THEME } from '@retikz/core';
import { defineEntityKind, defineRelationKind, BuiltinRelationRole } from '@retikz/graph';
import { describe, expect, it } from 'vitest';

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../src/errors';
import { FlowDiagramSchema } from '../../src/flow';
import { resolveFlowThemeRegistry } from '../../src/flow/providers';
import { resolveFlowDiagram } from '../../src/flow/resolve';

const resolve = (source: unknown, graph?: Parameters<typeof resolveFlowDiagram>[1]['graph']) =>
  resolveFlowDiagram(FlowDiagramSchema.parse(source), {
    theme: DEFAULT_RESOLVED_THEME,
    flowThemeDefinitions: resolveFlowThemeRegistry(),
    ...(graph === undefined ? {} : { graph }),
  });

const expectDiagramError = (
  source: unknown,
  code: string,
  details: Readonly<Record<string, unknown>>,
): RetikzDiagramError => {
  try {
    resolve(source);

    expect.unreachable('Expected Flow resolve failure');
  } catch (error) {
    if (!(error instanceof RetikzDiagramError)) throw error;

    expect(error.code).toBe(code);
    expect(error.details).toMatchObject(details);

    return error;
  }
};

const singleEntityFlow = {
  namespace: 'diagram',
  type: 'flow',
  entities: [{ id: 'entity', text: 'Entity' }],
  groups: [],
  layouts: [],
  children: ['entity'],
} as const;

describe('Flow Source 解析', () => {
  it('在 Flow 默认值和项目覆盖之后投影根 Graph 规则', () => {
    const graph = {
      entityKinds: [
        defineEntityKind({ kind: 'docs.logic.important', role: 'activity', description: 'Important logic content' }),
      ],
      relationKinds: [
        defineRelationKind({ kind: 'docs.logic.data-flow', role: BuiltinRelationRole.Flow, description: 'Data flow' }),
      ],
    };
    const source = {
      namespace: 'diagram',
      type: 'flow',
      graphRules: [
        { type: 'entity', selector: { kind: 'docs.logic.important' }, style: { color: 'dodgerblue' } },
        { type: 'relation', selector: { kind: 'docs.logic.data-flow' }, style: { color: 'darkorange' } },
      ],
      entities: [
        { id: 'rule', text: 'Rule', role: 'activity', kind: 'docs.logic.important' },
        {
          id: 'explicit',
          text: 'Explicit',
          role: 'activity',
          kind: 'docs.logic.important',
          style: { color: 'green' },
        },
      ],
      groups: [],
      layouts: [],
      children: ['rule', 'explicit'],
      relations: [
        { source: 'rule', target: 'explicit', kind: 'docs.logic.data-flow', style: { color: 'green' } },
        { source: 'explicit', target: 'rule', kind: 'docs.logic.data-flow' },
      ],
      defaultFlow: { entity: { style: { fill: 'lightgray' } }, relation: { style: { strokeWidth: 2 } } },
    };

    const resolved = resolve(source, graph);
    const rule = resolved.elements[0];
    const explicit = resolved.elements[1];

    expect(rule).toMatchObject({ type: 'entity', graph: { style: { color: 'dodgerblue', fill: 'lightgray' } } });
    expect(explicit).toMatchObject({ type: 'entity', graph: { style: { color: 'green', fill: 'lightgray' } } });
    expect(resolved.relations[0]?.graph.style).toMatchObject({ color: 'green', strokeWidth: 2 });
    expect(resolved.relations[1]?.graph.style).toMatchObject({ color: 'darkorange', strokeWidth: 2 });
  });

  it('项目通过 Graph 分类颜色回退共享 Flow Entity 和 Relation 组', () => {
    const resolved = resolve({
      namespace: 'diagram',
      type: 'flow',
      entities: [
        { id: 'first', text: 'First', group: 'forward' },
        { id: 'second', text: 'Second', group: 'reverse' },
        { id: 'third', text: 'Third' },
      ],
      groups: [],
      layouts: [],
      children: ['first', 'second', 'third'],
      relations: [
        { source: 'first', target: 'second', group: 'forward' },
        { source: 'second', target: 'third', group: 'reverse' },
        { source: 'third', target: 'first', group: 'forward' },
        { source: 'first', target: 'third' },
      ],
    });
    const palette = DEFAULT_RESOLVED_THEME.colors.categorical;

    expect(
      resolved.elements.map(element => (element.type === 'entity' ? element.graph.style?.color : undefined)),
    ).toEqual([palette.at(0), palette.at(1), undefined]);
    expect(resolved.relations.map(relation => relation.graph.style?.color)).toEqual([
      palette.at(0),
      palette.at(1),
      palette.at(0),
      undefined,
    ]);
  });

  it('根据所属模块的 children 顺序及目录路径重建唯一递归 Canonical 树', () => {
    const resolved = resolve({
      namespace: 'diagram',
      type: 'flow',
      entities: [
        { id: 'entity', text: 'Entity' },
        { id: 'target', text: 'Target' },
      ],
      groups: [{ id: 'group', children: ['entity'] }],
      layouts: [],
      children: ['group', 'target'],
      relations: [{ source: 'entity', target: 'target' }],
    });
    const group = resolved.elements[0];
    if (group.type !== 'group') throw new Error('Expected Group');

    const entity = group.elements[0];
    if (entity.type !== 'entity') throw new Error('Expected Entity');

    expect(group.graph).toMatchObject({ namespace: 'graph', type: 'group', id: 'group' });
    expect(entity.graph).toMatchObject({ namespace: 'graph', type: 'entity', id: 'entity', role: 'concept' });
    expect(resolved.relations[0]?.graph).toMatchObject({
      namespace: 'graph',
      type: 'relation',
      source: { id: 'entity' },
      target: { id: 'target' },
      role: 'flow',
      direction: 'forward',
    });
    expect(resolved.elementPaths.get('entity')).toEqual(['entities', 0]);
    expect(resolved.elementPaths.get('target')).toEqual(['entities', 1]);
    expect(resolved.elementPaths.get('group')).toEqual(['groups', 0]);
    expect(resolved.relations[0]).toMatchObject({ path: ['relations', 0] });
  });

  it('不允许目录声明顺序影响重建的树', () => {
    const source = {
      namespace: 'diagram',
      type: 'flow',
      entities: [
        { id: 'second', text: 'Second' },
        { id: 'first', text: 'First' },
      ],
      groups: [],
      layouts: [{ kind: 'linear' as const, id: 'layout', direction: 'right', children: ['first'] }],
      children: ['layout', 'second'],
    };
    const reordered = {
      ...source,
      entities: [...source.entities].reverse(),
    };

    const elementIds = (value: ReturnType<typeof resolve>): Array<string> =>
      value.elements.flatMap(element => [
        element.id,
        ...(element.type === 'entity' ? [] : element.elements.map(child => child.id)),
      ]);

    expect(elementIds(resolve(source))).toEqual(['layout', 'first', 'second']);
    expect(elementIds(resolve(reordered))).toEqual(['layout', 'first', 'second']);
  });

  it('项目结构化 Entity 文本和状态不变为 Graph', () => {
    const text = ['Frontend form', { text: 'Complete user details', fill: 'gray', font: { size: 'sm' } }];
    const resolved = resolve({
      namespace: 'diagram',
      type: 'flow',
      entities: [
        {
          id: 'form',
          text,
          status: 'success',
          layout: { align: 'start', lineHeight: 18, maxTextWidth: 160 },
        },
        { id: 'target', text: 'Target', status: 'disabled' },
      ],
      groups: [],
      layouts: [],
      children: ['form', 'target'],
      relations: [{ source: 'form', target: 'target', status: 'warning' }],
    });
    const entity = resolved.elements[0];
    if (entity.type !== 'entity') throw new Error('Expected Entity');

    expect(entity.graph).toMatchObject({
      id: 'form',
      text,
      status: 'success',
      layout: { align: 'start', lineHeight: 18, maxTextWidth: 160 },
    });
    expect(resolved.elements[1]).toMatchObject({ type: 'entity', graph: { status: 'disabled' } });
    expect(resolved.relations[0]?.graph.status).toBe('warning');
  });

  it('报告后来的跨目录重复 ID 及其声明路径', () => {
    expectDiagramError(
      {
        namespace: 'diagram',
        type: 'flow',
        entities: [{ id: 'duplicate', text: 'First' }],
        groups: [],
        layouts: [{ kind: 'linear' as const, id: 'duplicate', direction: 'right', children: ['duplicate'] }],
        children: ['duplicate'],
      },
      RetikzDiagramErrorCode.FlowDuplicateId,
      { path: ['layouts', 0, 'id'], relatedIds: ['duplicate'] },
    );
  });

  it.each([
    {
      name: 'unknown root child',
      source: { ...singleEntityFlow, children: ['missing'] },
      path: ['children', 0],
    },
    {
      name: 'unknown Group child',
      source: {
        ...singleEntityFlow,
        layouts: [{ kind: 'linear' as const, id: 'layout', direction: 'right', children: ['missing'] }],
        children: ['layout'],
      },
      path: ['layouts', 0, 'children', 0],
    },
  ])('在编写的子路径中报告 $name', ({ source, path }) => {
    expectDiagramError(source, RetikzDiagramErrorCode.FlowReferenceNotFound, {
      path,
      relatedIds: ['missing'],
    });
  });

  it.each([
    {
      name: 'duplicate child',
      source: { ...singleEntityFlow, children: ['entity', 'entity'] },
      path: ['children', 1],
      reason: 'duplicate-child',
    },
    {
      name: 'multiple parents',
      source: {
        ...singleEntityFlow,
        layouts: [{ kind: 'linear' as const, id: 'layout', direction: 'right', children: ['entity'] }],
        children: ['layout', 'entity'],
      },
      path: ['layouts', 0, 'children', 0],
      reason: 'multiple-parents',
    },
    {
      name: 'orphan declaration',
      source: {
        ...singleEntityFlow,
        entities: [...singleEntityFlow.entities, { id: 'orphan', text: 'Orphan' }],
      },
      path: ['entities', 1],
      reason: 'orphan',
    },
    {
      name: 'self containment',
      source: {
        ...singleEntityFlow,
        layouts: [{ kind: 'linear' as const, id: 'layout', direction: 'right', children: ['layout'] }],
        children: ['entity'],
      },
      path: ['layouts', 0, 'children', 0],
      reason: 'self-containment',
    },
    {
      name: 'containment cycle',
      source: {
        ...singleEntityFlow,
        groups: [{ id: 'b', children: ['a'] }],
        layouts: [{ kind: 'linear' as const, id: 'a', direction: 'right', children: ['b'] }],
        children: ['entity'],
      },
      path: ['layouts', 0, 'children', 0],
      reason: 'cycle',
    },
  ])('拒绝 $name 而不修复收容', ({ source, path, reason }) => {
    expectDiagramError(source, RetikzDiagramErrorCode.FlowContainmentInvalid, { path, reason });
  });

  it.each(['source', 'target'] as const)('报告确切字段路径处未解析的 %s 端点', endpoint => {
    expectDiagramError(
      {
        ...singleEntityFlow,
        relations: [
          {
            source: endpoint === 'source' ? 'missing' : 'entity',
            target: endpoint === 'target' ? 'missing' : 'entity',
          },
        ],
      },
      RetikzDiagramErrorCode.FlowReferenceNotFound,
      { path: ['relations', 0, endpoint], relatedIds: ['missing'] },
    );
  });

  it.each(['source', 'target'] as const)('拒绝 Layout 作为关系 %s', endpoint => {
    expectDiagramError(
      {
        ...singleEntityFlow,
        layouts: [{ kind: 'linear' as const, id: 'layout', direction: 'right', children: ['entity'] }],
        children: ['layout'],
        relations: [
          {
            source: endpoint === 'source' ? 'layout' : 'entity',
            target: endpoint === 'target' ? 'layout' : 'entity',
          },
        ],
      },
      RetikzDiagramErrorCode.FlowEndpointInvalid,
      {
        path: ['relations', 0, endpoint],
        relatedIds: ['layout'],
        reason: 'layout-endpoint',
      },
    );
  });

  it('保持可见的 Group 端点、自循环、并行关系、循环和交叉 Group 引用合法', () => {
    const resolved = resolve({
      namespace: 'diagram',
      type: 'flow',
      entities: [
        { id: 'a', text: 'A' },
        { id: 'b', text: 'B' },
      ],
      groups: [
        { id: 'left', children: ['a'] },
        { id: 'right', children: ['b'] },
      ],
      layouts: [],
      children: ['left', 'right'],
      relations: [
        { source: 'a', target: 'a' },
        { source: 'a', target: 'b' },
        { source: 'a', target: 'b' },
        { source: 'b', target: 'a' },
        { source: 'left', target: 'right' },
      ],
    });

    expect(resolved.relations.map(relation => [relation.source.source.id, relation.source.target.id])).toEqual([
      ['a', 'a'],
      ['a', 'b'],
      ['a', 'b'],
      ['b', 'a'],
      ['left', 'right'],
    ]);
  });
});
