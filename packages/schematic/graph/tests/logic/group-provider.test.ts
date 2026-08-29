import { resolveCoreProviderDependencies } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import * as Graph from '../../src';

describe('Group provider closure', () => {
  it('resolves Group, Block, Entity, Relation, FlexLayout, Surface and Surface clip dependencies', () => {
    const definitions = resolveCoreProviderDependencies({
      contributions: [{ roots: [Graph.GroupProviderKey], providers: Graph.createGraphProviders() }],
    });

    expect(definitions.composites?.map(definition => `${definition.namespace}.${definition.type}`)).toEqual(
      expect.arrayContaining([
        'graph.group',
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
    expect(definitions.clips?.map(definition => definition.kind)).toContain('path');
  });
});
