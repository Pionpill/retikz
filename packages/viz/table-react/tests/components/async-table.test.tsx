// @vitest-environment jsdom
import { createDataTransformExecutor } from '@retikz/data';
import { Layout } from '@retikz/react';
import { detailTable } from '@retikz/table-vanilla';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DetailTable, Table } from '../../src';

describe('Table client preparation', () => {
  beforeEach(() => {
    Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  afterEach(() => vi.restoreAllMocks());

  it.each([false, true])('renders typed Promise data with embedded=%s', async embedded => {
    let executions = 0;
    const dataTransformExecutor = createDataTransformExecutor<{ values: Array<number> }>({
      dataExecution: { mode: 'external', external: 'native' },
      externalProviders: [
        {
          name: 'native',
          provider: {
            resolve: stage => ({
              kind: 'supported',
              implementation: {
                definition: stage.definition,
                execute: async input => {
                  await Promise.resolve();
                  executions++;
                  if (input.kind !== 'source') throw new Error('native input expected');

                  return {
                    rows: input.source.values.map(value => ({ value, ratio: value / 8 })),
                    model: stage.outputModel,
                  };
                },
              },
            }),
          },
        },
      ],
    });
    const spec = detailTable({
      dataRef: 'rows',
      model: [{ name: 'value', type: 'continuous' }],
      header: false,
      columns: [{ id: 'ratio', field: 'ratio' }],
      transform: [{ operation: { kind: 'normalize', field: 'value', as: 'ratio' } }],
    });
    const dataBindings = { rows: { kind: 'source' as const, source: { values: [2, 6] } } };
    const onManifest = vi.fn();
    const table = embedded ? (
      <Table spec={spec} dataBindings={dataBindings} dataTransformExecutor={dataTransformExecutor} />
    ) : (
      <DetailTable
        dataRef="rows"
        model={spec.data.model}
        columns={spec.structure.columns}
        header={false}
        transform={spec.transform}
        dataBindings={dataBindings}
        dataTransformExecutor={dataTransformExecutor}
        onManifest={onManifest}
      />
    );
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(embedded ? <Layout runtime={{ preparation: 'async' }}>{table}</Layout> : table);
      await Promise.resolve();
    });

    expect(container.textContent).toContain('0.25');
    expect(container.textContent).toContain('0.75');
    expect(executions).toBe(1);

    if (!embedded) {
      expect(onManifest).toHaveBeenCalledOnce();
      expect(onManifest.mock.calls[0][0].allocationBounds.height).toBeGreaterThan(0);
    }

    act(() => root.unmount());
    container.remove();
  });
});
