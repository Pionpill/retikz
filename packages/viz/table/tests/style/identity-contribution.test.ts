import type * as RetikzCore from '@retikz/core';

import { describe, expect, it, vi } from 'vitest';

const compileCalls = vi.hoisted(() => [] as Array<ReadonlyArray<unknown>>);

vi.mock('@retikz/core', async importOriginal => {
  const actual = await importOriginal<typeof RetikzCore>();
  return {
    ...actual,
    compileToScene: vi.fn((...args: Array<unknown>) => {
      compileCalls.push(args);
      return {
        scene: { version: 1, type: 'scene', children: [] },
        artifacts: [
          {
            kind: 'composite',
            namespace: 'table',
            type: 'table',
            occurrence: { sourcePath: 'children[0]', expansionPath: [] },
            value: {},
          },
        ],
      };
    }),
  };
});

import {
  compileTable,
  createManualTableSpec,
  createTableRuntimeContribution,
  TableThemeTokenDefinition,
} from '../../src';

describe('Table theme token contribution identity', () => {
  it('compileTable injects the canonical definition singleton', () => {
    compileCalls.length = 0;

    compileTable(createManualTableSpec({ rows: [[null]] }), {});

    const options = compileCalls.at(-1)?.[1] as { themeTokenDefinitions?: Array<unknown> } | undefined;
    const definitions = options?.themeTokenDefinitions;
    expect(definitions).toEqual([TableThemeTokenDefinition]);
    expect((definitions as Array<unknown>)[0]).toBe(TableThemeTokenDefinition);
  });

  it('runtime contributions reuse the canonical definition singleton', () => {
    const contribution = createTableRuntimeContribution({ reference: 'panel/table' });
    const definitions = contribution.themeTokenDefinitions;

    expect(definitions).toEqual([TableThemeTokenDefinition]);
    expect((definitions as Array<unknown>)[0]).toBe(TableThemeTokenDefinition);
  });
});
