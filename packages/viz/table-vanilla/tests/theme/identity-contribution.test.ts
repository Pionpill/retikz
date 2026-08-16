import type { InputEmbedContext } from '@retikz/vanilla';

import { createManualTableIR } from '@retikz/table';
import { describe, expect, it } from 'vitest';

import { inputTableFromIR, TableInputEmbedAdapter } from '../../src';

const contextOf = (id: string): InputEmbedContext => ({
  id,
  kind: 'table',
  layerId: 'content',
  identityPath: ['content', id],
});

describe('Table Vanilla runtime style contract', () => {
  it('adapter contributions keep removed theme token definitions out of the payload', () => {
    const spec = createManualTableIR({ rows: [[null]] });
    const contribution = TableInputEmbedAdapter.lower({ table: inputTableFromIR(spec) }, contextOf('panel'));
    expect(contribution).not.toHaveProperty('themeTokenDefinitions');
    expect(contribution).not.toHaveProperty('datasets');
    expect(contribution).not.toHaveProperty('makeComposites');
    expect(contribution.providerDependencies.roots).toEqual([{ capability: 'composite', namespace: 'table', type: 'table' }]);
  });
});
