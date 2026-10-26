import { resolveCoreProviderDependencies } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import * as Graph from '../../src';

describe('Group 提供者关闭', () => {
  it('解决 Group、Block、Entity、Relation、FlexLayout、Surface 和 Surface 裁剪依赖性', () => {
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
