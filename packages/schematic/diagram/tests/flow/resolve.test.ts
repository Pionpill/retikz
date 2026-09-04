import { DEFAULT_RESOLVED_THEME } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../src/errors';
import { FlowDiagramSchema } from '../../src/flow';
import { resolveFlowThemeStyleRegistry } from '../../src/flow/providers';
import { resolveFlowDiagram } from '../../src/flow/resolve';

const resolve = (source: unknown) =>
  resolveFlowDiagram(FlowDiagramSchema.parse(source), {
    theme: DEFAULT_RESOLVED_THEME,
    flowThemeStyles: resolveFlowThemeStyleRegistry(),
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

describe('Flow Source resolve', () => {
  it('rebuilds one recursive Canonical tree from owner children order and catalog paths', () => {
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

  it('does not let catalog declaration order affect the reconstructed tree', () => {
    const source = {
      namespace: 'diagram',
      type: 'flow',
      entities: [
        { id: 'second', text: 'Second' },
        { id: 'first', text: 'First' },
      ],
      groups: [],
      layouts: [{ id: 'layout', direction: 'right', children: ['first'] }],
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

  it('projects structured Entity text and status unchanged to Graph', () => {
    const text = ['Frontend form', { text: 'Complete user details', fill: 'gray', font: { size: 'sm' } }];
    const resolved = resolve({
      namespace: 'diagram',
      type: 'flow',
      entities: [
        {
          id: 'form',
          text,
          status: 'success',
          style: { align: 'start', lineHeight: 18, maxTextWidth: 160 },
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
      align: 'start',
      lineHeight: 18,
      maxTextWidth: 160,
    });
    expect(resolved.elements[1]).toMatchObject({ type: 'entity', graph: { status: 'disabled' } });
    expect(resolved.relations[0]?.graph.status).toBe('warning');
  });

  it('reports the later cross-catalog duplicate id with its declaration path', () => {
    expectDiagramError(
      {
        namespace: 'diagram',
        type: 'flow',
        entities: [{ id: 'duplicate', text: 'First' }],
        groups: [],
        layouts: [{ id: 'duplicate', direction: 'right', children: ['duplicate'] }],
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
        layouts: [{ id: 'layout', direction: 'right', children: ['missing'] }],
        children: ['layout'],
      },
      path: ['layouts', 0, 'children', 0],
    },
  ])('reports $name at the authored children path', ({ source, path }) => {
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
        layouts: [{ id: 'layout', direction: 'right', children: ['entity'] }],
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
        layouts: [{ id: 'layout', direction: 'right', children: ['layout'] }],
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
        layouts: [{ id: 'a', direction: 'right', children: ['b'] }],
        children: ['entity'],
      },
      path: ['layouts', 0, 'children', 0],
      reason: 'cycle',
    },
  ])('rejects $name without repairing containment', ({ source, path, reason }) => {
    expectDiagramError(source, RetikzDiagramErrorCode.FlowContainmentInvalid, { path, reason });
  });

  it.each(['source', 'target'] as const)('reports an unresolved %s endpoint at the exact field path', endpoint => {
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

  it.each(['source', 'target'] as const)('rejects a Layout as relation %s', endpoint => {
    expectDiagramError(
      {
        ...singleEntityFlow,
        layouts: [{ id: 'layout', direction: 'right', children: ['entity'] }],
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

  it('keeps visible Group endpoints, self-loops, parallel relations, cycles and cross-Group references legal', () => {
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

    expect(resolved.relations.map(relation => [relation.source.source, relation.source.target])).toEqual([
      ['a', 'a'],
      ['a', 'b'],
      ['a', 'b'],
      ['b', 'a'],
      ['left', 'right'],
    ]);
  });
});
