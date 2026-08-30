import type { CoreDependencyProvider } from '@retikz/core';

import { compileToScene, CompositeBaseSchema, defineComposite, resolveCoreProviderDependencies } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import * as Graph from '../../src';

describe('Block provider closure', () => {
  it('resolves Block, public structures, Entity, Relation, FlexLayout and Surface', () => {
    const definitions = resolveCoreProviderDependencies({
      contributions: [{ roots: [Graph.BlockProviderKey], providers: Graph.createGraphProviders() }],
    });
    const keys = definitions.composites?.map(definition => `${definition.namespace}.${definition.type}`);

    expect(keys).toEqual(
      expect.arrayContaining([
        'graph.block',
        'graph.blockHeader',
        'graph.blockSection',
        'graph.blockRow',
        'graph.entity',
        'graph.relation',
        'layout.flexLayout',
        'standard.surface',
      ]),
    );
    expect(keys).not.toContain('graph.internalBlockRegion');
  });

  it('keeps structure providers independent from Block and Group providers', () => {
    for (const root of [Graph.BlockHeaderProviderKey, Graph.BlockSectionProviderKey, Graph.BlockRowProviderKey]) {
      const definitions = resolveCoreProviderDependencies({
        contributions: [{ roots: [root], providers: Graph.createGraphProviders() }],
      });
      const keys = definitions.composites?.map(definition => `${definition.namespace}.${definition.type}`);

      expect(keys).not.toContain('graph.block');
      expect(keys).not.toContain('graph.group');
      expect(keys).toEqual(expect.arrayContaining(['graph.entity', 'graph.relation', 'layout.flexLayout']));
    }
  });

  it('lowers a custom Tier 3 composite to Block through the Core provider path', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'serviceBlock',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('serviceBlock') }),
      expand: () => ({
        children: [
          Graph.createBlock({
            children: [Graph.createBlockHeader({ title: { text: 'Service' } })],
          }),
        ],
      }),
    });
    const provider: CoreDependencyProvider = Object.freeze({
      key: Object.freeze({ capability: 'composite', namespace: 'test', type: 'serviceBlock' }),
      dependencies: Object.freeze([Graph.BlockProviderKey]),
      datasets: Object.freeze({}),
      makeDefinition: () => definition,
    });
    const definitions = resolveCoreProviderDependencies({
      contributions: [{ roots: [provider.key], providers: [provider, ...Graph.createGraphProviders()] }],
    });
    const output = compileToScene(
      { type: 'scene', version: 1, children: [{ namespace: 'test', type: 'serviceBlock' }] },
      { ...definitions, padding: 0 },
    );

    expect(JSON.stringify(output.scene.primitives)).toContain('Service');
  });

  it('does not export a Cell composite or the removed internal region runtime', () => {
    expect('BlockCellDefinition' in Graph).toBe(false);
    expect('BlockCellProviderKey' in Graph).toBe(false);
    expect('InternalBlockRegionProvider' in Graph).toBe(false);
    expect('BlockRegionSchema' in Graph).toBe(false);
  });
});
