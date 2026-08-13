import type * as RetikzReact from '@retikz/react';

import { createManualTableSpec } from '@retikz/table';
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

describe('Table React runtime style contract', () => {
  it('standalone Table does not inject removed theme token definitions into Layout', () => {
    capturedLayouts.length = 0;

    renderToStaticMarkup(<Table spec={spec} />);

    expect(capturedLayouts.at(-1)).not.toHaveProperty('themeTokenDefinitions');
  });

  it('embedded Table adapter keeps removed theme token definitions out of the contribution payload', () => {
    const contribution = Table.embeddableAdapter.contribute({ spec });
    expect(contribution).not.toHaveProperty('themeTokenDefinitions');
    expect(contribution).not.toHaveProperty('datasets');
    expect(contribution).not.toHaveProperty('makeComposites');
    expect(contribution.compositeDependencies.roots).toEqual([{ namespace: 'table', type: 'table' }]);
  });
});
