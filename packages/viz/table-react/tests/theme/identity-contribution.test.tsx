import type * as RetikzReact from '@retikz/react';

import { createManualTableSpec, TableThemeTokenDefinition } from '@retikz/table';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const capturedLayouts = vi.hoisted(() => [] as Array<Record<string, unknown>>);

vi.mock('@retikz/react', async importOriginal => {
  const actual = await importOriginal<typeof RetikzReact>();
  return {
    ...actual,
    Layout: (props: Record<string, unknown>) => {
      capturedLayouts.push(props);
      return null;
    },
  };
});

import { Table } from '../../src';

const spec = createManualTableSpec({ id: 'scores', rows: [[null]] });

describe('Table React theme token contribution identity', () => {
  it('standalone Table passes the canonical definition to Layout', () => {
    capturedLayouts.length = 0;

    renderToStaticMarkup(<Table spec={spec} />);

    const definitions = capturedLayouts.at(-1)?.themeTokenDefinitions;
    expect(definitions).toEqual([TableThemeTokenDefinition]);
    expect((definitions as Array<unknown>)[0]).toBe(TableThemeTokenDefinition);
  });

  it('embedded Table adapter passes the same canonical definition singleton', () => {
    const contribution = Table.embeddableAdapter.contribute({ spec });
    const definitions = contribution.themeTokenDefinitions;

    expect(definitions).toEqual([TableThemeTokenDefinition]);
    expect((definitions as Array<unknown>)[0]).toBe(TableThemeTokenDefinition);
  });
});
