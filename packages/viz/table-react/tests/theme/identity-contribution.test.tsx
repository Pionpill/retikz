import type * as RetikzReact from '@retikz/react';
import { createManualTableIR } from '@retikz/table';
import { tableInputEmbedAdapter } from '@retikz/table-vanilla';
import type { InputEmbedContext } from '@retikz/vanilla';
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

const spec = createManualTableIR({ id: 'scores', rows: [[null]] });

describe('Table React 运行时风格契约', () => {
  it('独立的 Table 不会将已删除的主题定义注入到 Layout 中', () => {
    capturedLayouts.length = 0;

    renderToStaticMarkup(<Table spec={spec} />);

    expect(capturedLayouts.at(-1)).not.toHaveProperty('themeTokenDefinitions');
  });

  it('Table Vanilla 适配器将已删除的主题定义保留在贡献负载之外', () => {
    const input = Table.createInputEmbedProps({ spec });
    const context: InputEmbedContext = {
      id: 'scores',
      kind: 'table',
      layerId: 'default',
      identityPath: ['default', 'scores'],
    };
    const contribution = tableInputEmbedAdapter.lower(input, context);

    expect(contribution).not.toHaveProperty('themeTokenDefinitions');
    expect(contribution).not.toHaveProperty('datasets');
    expect(contribution).not.toHaveProperty('makeComposites');
    expect(contribution.providerDependencies.roots).toEqual([
      { capability: 'composite', namespace: 'table', type: 'table' },
    ]);
  });
});
