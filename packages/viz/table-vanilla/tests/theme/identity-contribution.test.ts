import type { VanillaEmbedContext } from '@retikz/vanilla';

import { createManualTableSpec, TableThemeTokenDefinition } from '@retikz/table';
import { describe, expect, it } from 'vitest';

import { createTableAdapter } from '../../src';

const contextOf = (id: string): VanillaEmbedContext => ({
  id,
  kind: 'table',
  namespace: 'table',
  layerId: 'content',
  identityPath: ['content', id],
});

describe('Table Vanilla theme token contribution identity', () => {
  it('adapter contributions reuse the canonical definition singleton', () => {
    const spec = createManualTableSpec({ rows: [[null]] });
    const contribution = createTableAdapter().lower({ spec }, contextOf('panel'));
    const definitions = contribution.themeTokenDefinitions;

    expect(definitions).toEqual([TableThemeTokenDefinition]);
    expect((definitions as Array<unknown>)[0]).toBe(TableThemeTokenDefinition);
  });
});
