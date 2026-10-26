import { createManualTableIR } from '@retikz/table';
import type { InputEmbedContext } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { inputTableFromIR, TableInputEmbedAdapter } from '../../src';

const contextOf = (id: string): InputEmbedContext => ({
  id,
  kind: 'table',
  layerId: 'content',
  identityPath: ['content', id],
});

describe('Table Vanilla 运行时风格契约', () => {
  it('适配器贡献将已删除的主题定义保留在有效负载之外', () => {
    const spec = createManualTableIR({ rows: [[null]] });
    const contribution = TableInputEmbedAdapter.lower({ table: inputTableFromIR(spec) }, contextOf('panel'));

    expect(contribution).not.toHaveProperty('themeTokenDefinitions');
    expect(contribution).not.toHaveProperty('datasets');
    expect(contribution).not.toHaveProperty('makeComposites');
    expect(contribution.providerDependencies.roots).toEqual([
      { capability: 'composite', namespace: 'table', type: 'table' },
    ]);
  });
});
