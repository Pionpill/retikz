// @vitest-environment jsdom
import type { DataTransformImplementationProvider } from '@retikz/data';
import { createDataTransformExecutor } from '@retikz/data';
import { PlotSchema } from '@retikz/plot';
import { Layout } from '@retikz/react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Plot, resolvePlotAuthoring } from '../src';

const rows = [
  { x: 1, y: 2 },
  { x: 2, y: 4 },
];
const spec = () =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'rows' },
    dataExecution: { mode: 'external', external: 'fixture' },
    scales: [
      { name: 'x', type: 'linear', domain: [0, 3] },
      { name: 'y', type: 'linear', domain: [0, 1] },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    transform: [{ operation: { kind: 'normalize', field: 'y', as: 'ratio' } }],
    marks: [{ type: 'point', encoding: { x: { field: 'x', scale: 'x' }, y: { field: 'ratio', scale: 'y' } } }],
  });

const fixture = () => {
  const execute = vi.fn();
  const provider: DataTransformImplementationProvider<never> = {
    resolve: stage => ({
      kind: 'supported',
      implementation: {
        definition: stage.definition,
        execute: async input => {
          await Promise.resolve();
          if (input.kind !== 'result') throw new Error('fixture requires canonical result');
          execute();
          return { rows: input.result.rows.map(row => ({ ...row, ratio: 0.75 })), model: stage.outputModel };
        },
      },
    }),
  };
  return { execute, executor: createDataTransformExecutor({ externalProviders: [{ name: 'fixture', provider }] }) };
};

describe('Plot client async preparation', () => {
  beforeEach(() => {
    Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it('renders actual Promise output and delivers the same prepared rows after commit', async () => {
    const { executor, execute } = fixture();
    const onLineage = vi.fn();
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <Plot
          spec={spec()}
          data={{ rows }}
          dataTransformExecutor={executor}
          lineage={{ rowValues: { fields: ['ratio'], maxRows: 2 } }}
          onLineage={onLineage}
        />,
      );
      await Promise.resolve();
    });
    expect(container.querySelectorAll('svg')).toHaveLength(1);
    expect(container.querySelectorAll('ellipse')).toHaveLength(2);
    expect(new Set([...container.querySelectorAll('ellipse')].map(point => point.getAttribute('cy'))).size).toBe(1);
    expect(onLineage).toHaveBeenCalledOnce();
    expect(JSON.stringify(onLineage.mock.calls[0])).toContain('0.75');
    expect(execute).toHaveBeenCalledOnce();
    act(() => root.unmount());
  });

  it('uses the outer Layout preparation with distinct anonymous Plot bindings', async () => {
    const { executor, execute } = fixture();
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const plot = spec();
    await act(async () => {
      root.render(
        <Layout runtime={{ preparation: 'async' }}>
          <Plot spec={plot} dataBindings={{ rows: { kind: 'rows', rows } }} dataTransformExecutor={executor} />
          <Plot
            spec={plot}
            dataBindings={{ rows: { kind: 'rows', rows: [rows[0]] } }}
            dataTransformExecutor={executor}
          />
        </Layout>,
      );
      await Promise.resolve();
    });
    expect(container.querySelectorAll('svg')).toHaveLength(1);
    expect(container.querySelectorAll('ellipse')).toHaveLength(3);
    expect(execute).toHaveBeenCalledTimes(2);
    act(() => root.unmount());
  });

  it('rejects two declarations of the root execution slot instead of adding a new override level', () => {
    expect(() => resolvePlotAuthoring({ spec: spec(), data: { rows }, dataExecution: { mode: 'builtin' } })).toThrow(
      /both spec and root props/,
    );
  });
});
