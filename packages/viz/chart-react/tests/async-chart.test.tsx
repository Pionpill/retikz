// @vitest-environment jsdom
import type { DataTransformImplementationProvider } from '@retikz/data';
import { createDataTransformExecutor } from '@retikz/data';
import { Layout } from '@retikz/react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ScatterChart } from '../src/point';

type NativeRows = { values: Array<{ x: number; y: number }> };

describe('Chart client preparation', () => {
  beforeEach(() => {
    Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => vi.restoreAllMocks());
  it.each([false, true])('renders typed native Promise input with embedded=%s', async embedded => {
    const execute = vi.fn();
    const provider: DataTransformImplementationProvider<NativeRows> = {
      resolve: stage => ({
        kind: 'supported',
        implementation: {
          definition: stage.definition,
          execute: async input => {
            await Promise.resolve();
            if (input.kind !== 'source') throw new Error('native input required');
            execute();
            return { rows: input.source.values.map(row => ({ ...row, ratio: 0.75 })), model: stage.outputModel };
          },
        },
      }),
    };
    const chart = (
      <ScatterChart
        data={{
          reference: 'native',
          model: [
            { name: 'x', type: 'continuous' },
            { name: 'y', type: 'continuous' },
          ],
        }}
        dataBindings={{
          native: {
            kind: 'source',
            source: {
              values: [
                { x: 1, y: 2 },
                { x: 2, y: 4 },
              ],
            },
          },
        }}
        dataTransformExecutor={createDataTransformExecutor({ externalProviders: [{ name: 'fixture', provider }] })}
        dataExecution={{ mode: 'external', external: 'fixture' }}
        presentation={{ title: { text: 'Native output' } }}
        recipe={{
          encodings: {
            x: 'x',
            y: { transform: { operation: { kind: 'normalize', field: 'y', as: 'ratio' } }, output: 'ratio' },
          },
        }}
      />
    );
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(embedded ? <Layout runtime={{ preparation: 'async' }}>{chart}</Layout> : chart);
      await Promise.resolve();
    });
    expect(container.textContent).toContain('Native output');
    expect(container.querySelectorAll('svg')).toHaveLength(1);
    expect(container.querySelectorAll('ellipse')).toHaveLength(2);
    expect(new Set([...container.querySelectorAll('ellipse')].map(point => point.getAttribute('cy'))).size).toBe(1);
    expect(execute).toHaveBeenCalledOnce();
    act(() => root.unmount());
    container.remove();
  });
});
