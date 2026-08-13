import type { VanillaEmbedContext } from '@retikz/vanilla';

import { createManualTableSpec } from '@retikz/table';
import { describe, expect, it } from 'vitest';

import { createTableAdapter } from '../../src';

const contextOf = (id: string): VanillaEmbedContext => ({
  id,
  kind: 'table',
  layerId: 'content',
  identityPath: ['content', id],
});

describe('Table Vanilla runtime style contract', () => {
  it('adapter contributions keep removed theme token definitions out of the payload', () => {
    const spec = createManualTableSpec({ rows: [[null]] });
    const contribution = createTableAdapter().lower({ spec }, contextOf('panel'));
    expect(contribution).not.toHaveProperty('themeTokenDefinitions');
    expect(contribution).not.toHaveProperty('datasets');
    expect(contribution).not.toHaveProperty('makeComposites');
    expect(contribution.providerDependencies.roots).toEqual([{ capability: 'composite', namespace: 'table', type: 'table' }]);
  });
});
