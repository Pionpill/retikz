// @vitest-environment jsdom
import type { CompileResult } from '@retikz/core';

import {
  compileToScene,
  CompositeBaseSchema,
  defineComposite,
  resolveSpatialHandle,
  selectSpatialHandles,
} from '@retikz/core';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { literal, number } from 'zod';

import { Layout } from '../../../src';

const card = defineComposite({
  namespace: 'third',
  type: 'card',
  schema: CompositeBaseSchema.extend({
    namespace: literal('third'),
    type: literal('card'),
    width: number(),
  }),
  expand: node => ({
    children: [{ type: 'node', position: [0, 0], minimumWidth: node.width, minimumHeight: 10 }],
    spatialHandles: [{ key: 'body', role: 'card', bounds: { x: 0, y: 0, width: node.width, height: 10 } }],
  }),
});

const scene = (width: number) => ({
  version: 1 as const,
  type: 'scene' as const,
  children: [{ namespace: 'third', type: 'card', width }],
});

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('<Layout onCompileResult>', () => {
  it('does not publish user callbacks during SSR render', () => {
    const onCompileResult = vi.fn();
    renderToStaticMarkup(
      <Layout ir={scene(10)} composites={[card]} onCompileResult={onCompileResult} runtime={{ mode: 'static' }} />,
    );
    expect(onCompileResult).not.toHaveBeenCalled();
  });

  it.each(['static', 'retained'] as const)('publishes the committed full result in %s mode', async mode => {
    const onCompileResult = vi.fn();
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(() =>
      root.render(<Layout ir={scene(10)} composites={[card]} onCompileResult={onCompileResult} runtime={{ mode }} />),
    );

    expect(onCompileResult).toHaveBeenCalledTimes(1);
    expect(onCompileResult.mock.calls[0]?.[0].spatialHandles.entries[0]?.geometry.bounds.width).toBe(10);
    await act(() => root.unmount());
  });

  it('preserves direct compile spatial entries and query results', async () => {
    const direct = compileToScene(scene(10), { composites: [card] });
    const onCompileResult = vi.fn();
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(() =>
      root.render(
        <Layout ir={scene(10)} composites={[card]} onCompileResult={onCompileResult} runtime={{ mode: 'static' }} />,
      ),
    );

    const reactResult = onCompileResult.mock.calls[0]?.[0] as CompileResult;
    const selector = { owner: { namespace: 'third', type: 'card' }, key: 'body' } as const;

    expect(reactResult.spatialHandles.entries).toEqual(direct.spatialHandles.entries);
    expect(selectSpatialHandles(reactResult.spatialHandles, selector)).toEqual(
      selectSpatialHandles(direct.spatialHandles, selector),
    );
    expect(resolveSpatialHandle(reactResult.spatialHandles, selector)).toEqual(
      resolveSpatialHandle(direct.spatialHandles, selector),
    );
    await act(() => root.unmount());
  });

  it('publishes each successful retained update exactly once', async () => {
    const onCompileResult = vi.fn();
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(() => root.render(<Layout ir={scene(10)} composites={[card]} onCompileResult={onCompileResult} />));
    const initial = onCompileResult.mock.calls[0]?.[0];
    await act(() => root.render(<Layout ir={scene(20)} composites={[card]} onCompileResult={onCompileResult} />));

    expect(onCompileResult).toHaveBeenCalledTimes(2);
    expect(initial?.spatialHandles.entries[0]?.geometry.bounds.width).toBe(10);
    expect(onCompileResult.mock.calls[1]?.[0].spatialHandles.entries[0]?.geometry.bounds.width).toBe(20);
    expect(onCompileResult.mock.calls[1]?.[0]).not.toBe(initial);
    await act(() => root.unmount());
  });

  it('isolates callback failure after the retained host commit', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const container = document.createElement('div');
    const root = createRoot(container);
    let committed: CompileResult | undefined;
    const onCompileResult = vi.fn((result: CompileResult) => {
      committed = result;
      (result.spatialHandles.entries as Array<unknown>).push(result.spatialHandles.entries[0]);
    });

    await act(() => root.render(<Layout ir={scene(10)} composites={[card]} onCompileResult={onCompileResult} />));

    expect(container.querySelector('svg')).not.toBeNull();
    expect(onCompileResult).toHaveBeenCalledTimes(1);
    expect(committed?.spatialHandles.entries).toHaveLength(1);
    expect(Object.isFrozen(committed?.spatialHandles.entries)).toBe(true);
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('onCompileResult callback failed'), expect.any(Error));
    await act(() => root.unmount());
  });
});
