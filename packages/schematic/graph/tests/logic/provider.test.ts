import type { IRChild, IRNode } from '@retikz/core';

import { lowerIRToKernel, resolveCoreProviderDependencies } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import * as Graph from '../../src';

const position = [0, 0] as const;

const sceneOf = (children: ReadonlyArray<IRChild>) => ({
  version: 1 as const,
  type: 'scene' as const,
  children: Array.from(children),
});

const nodesOf = (children: ReadonlyArray<IRChild>): Array<IRNode> =>
  children.flatMap(child => {
    if ('namespace' in child) return [];
    if (child.type === 'node') return [child];
    if (child.type === 'scope') return nodesOf(child.children);
    return [];
  });

const nodeById = (children: ReadonlyArray<IRChild>, id: string): IRNode => {
  const node = nodesOf(children).find(candidate => candidate.id === id);
  if (node !== undefined) return node;
  throw new Error(`Expected Node '${id}'`);
};

const resolveGraphProviders = (
  contributions: ReadonlyArray<
    Readonly<{
      roots: ReadonlyArray<typeof Graph.GraphProviderKey>;
      providers: ReturnType<typeof Graph.createGraphProviders>;
    }>
  >,
) => resolveCoreProviderDependencies({ contributions });

describe('Graph provider assembly', () => {
  it('loads the complete Graph dependency closure from GraphProviderKey', () => {
    const resolved = resolveGraphProviders([
      {
        roots: [Graph.GraphProviderKey],
        providers: Graph.createGraphProviders(),
      },
    ]);

    expect(resolved.composites?.map(definition => `${definition.namespace}.${definition.type}`).sort()).toEqual(
      ['graph.__entityPresentation', 'graph.container', 'graph.entity', 'graph.graph', 'graph.relation'].sort(),
    );
  });

  it('shares configured definitions across Graph, Container, and Entity providers', () => {
    const service = Graph.defineEntityRole({
      role: 'service',
      shape: { type: 'rectangle', params: { cornerRadius: 4 } },
      padding: { x: 10, y: 6 },
    });
    const resolved = resolveGraphProviders([
      {
        roots: [Graph.GraphProviderKey],
        providers: Graph.createGraphProviders({ entityRoles: [service] }),
      },
    ]);
    const lowered = lowerIRToKernel(
      sceneOf([
        Graph.createGraph({
          id: 'configured',
          children: [Graph.createEntity({ id: 'service', role: 'service', position })],
        }),
      ]),
      resolved,
    );

    expect(nodeById(lowered.children, 'service')).toMatchObject({
      shape: { type: 'rectangle', params: { cornerRadius: 4 } },
      padding: { x: 10, y: 6 },
    });
  });

  it('deduplicates repeated contributions of the same definition object', () => {
    const service = Graph.defineEntityRole({ role: 'service', shape: 'rectangle', padding: 6 });

    expect(() =>
      resolveGraphProviders([
        {
          roots: [Graph.GraphProviderKey],
          providers: Graph.createGraphProviders({ entityRoles: [service] }),
        },
        {
          roots: [Graph.GraphProviderKey],
          providers: Graph.createGraphProviders({ entityRoles: [service] }),
        },
      ]),
    ).not.toThrow();
  });

  it('rejects different definition objects that use the same key', () => {
    const first = Graph.defineEntityRole({ role: 'service', shape: 'rectangle', padding: 6 });
    const second = Graph.defineEntityRole({ role: 'service', shape: 'ellipse', padding: 6 });

    expect(() =>
      resolveGraphProviders([
        {
          roots: [Graph.GraphProviderKey],
          providers: Graph.createGraphProviders({ entityRoles: [first] }),
        },
        {
          roots: [Graph.GraphProviderKey],
          providers: Graph.createGraphProviders({ entityRoles: [second] }),
        },
      ]),
    ).toThrow(/Entity role 'service'.*different definition object/i);
  });

  it('does not leak one provider assembly registry into the next', () => {
    const service = Graph.defineEntityRole({ role: 'service', shape: 'rectangle', padding: 6 });
    resolveGraphProviders([
      {
        roots: [Graph.GraphProviderKey],
        providers: Graph.createGraphProviders({ entityRoles: [service] }),
      },
    ]);
    const defaults = resolveGraphProviders([
      {
        roots: [Graph.GraphProviderKey],
        providers: Graph.createGraphProviders(),
      },
    ]);

    expect(() =>
      lowerIRToKernel(sceneOf([Graph.createEntity({ id: 'service', role: 'service', position })]), defaults),
    ).toThrow(/Entity role 'service' is not registered/);
  });
});
