// @vitest-environment jsdom
import type { SynchronousInputEmbedAdapter } from '@retikz/vanilla';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Layout } from '../../../src';

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>(complete => {
    resolve = complete;
  });

  return { promise, resolve };
};

const contribution = (text: string) => ({
  node: { type: 'node' as const, position: [0, 0] as [number, number], text },
  providerDependencies: { roots: [], providers: [] },
});

const fixture = () => {
  const pending = new Map<string, ReturnType<typeof deferred>>();
  const prepared = vi.fn();
  const lowered = vi.fn();
  const adapter: SynchronousInputEmbedAdapter<{ value: string }> &
    Required<Pick<SynchronousInputEmbedAdapter<{ value: string }>, 'prepare'>> = {
    kind: 'async-fixture',
    lower: props => {
      lowered(props.value);
      return contribution(props.value);
    },
    prepare: props => {
      prepared(props.value);
      return {
        execute: async () => {
          await pending.get(props.value)?.promise;
          if (props.value === 'failure') throw new Error('fixture failed');
          return contribution(props.value);
        },
      };
    },
  };
  const Leaf = Object.assign((_props: { value: string }) => null, {
    isTier2Embeddable: true as const,
    inputEmbedAdapter: adapter,
  });

  return { Leaf, pending, prepared, lowered };
};

describe('Layout async processing bridge', () => {
  beforeEach(() => {
    Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it('uses Vanilla retained replacement and preserves the committed frame on current failure', async () => {
    const { Leaf, pending, lowered } = fixture();
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const publish = vi.fn();
    const draw = (value: string) => (
      <Layout runtime={{ preparation: 'async' }} onCompileResult={publish}>
        <Leaf value={value} />
      </Layout>
    );
    await act(async () => {
      root.render(draw('initial'));
      await Promise.resolve();
    });

    expect(container.textContent).toBe('initial');

    const slow = deferred();
    pending.set('slow', slow);
    await act(async () => {
      root.render(draw('slow'));
      await Promise.resolve();
    });
    await act(async () => {
      root.render(draw('latest'));
      await Promise.resolve();
    });

    expect(container.textContent).toBe('latest');

    await act(async () => {
      slow.resolve();
      await slow.promise;
    });

    expect(container.textContent).toBe('latest');

    const publications = publish.mock.calls.length;
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await act(async () => {
      root.render(draw('failure'));
      await Promise.resolve();
    });

    expect(container.textContent).toBe('latest');
    expect(publish).toHaveBeenCalledTimes(publications);
    expect(lowered).not.toHaveBeenCalled();

    act(() => root.unmount());
  });

  it('cancels pending initialization on a new input and never publishes after unmount', async () => {
    const { Leaf, pending } = fixture();
    const initial = deferred();
    pending.set('initial', initial);
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const publish = vi.fn();
    const draw = (value: string) => (
      <Layout runtime={{ preparation: 'async' }} onCompileResult={publish}>
        <Leaf value={value} />
      </Layout>
    );
    await act(async () => {
      root.render(draw('initial'));
      await Promise.resolve();
    });
    await act(async () => {
      root.render(draw('latest'));
      await Promise.resolve();
    });

    expect(container.textContent).toBe('latest');

    await act(async () => {
      initial.resolve();
      await initial.promise;
    });

    expect(container.textContent).toBe('latest');

    const slow = deferred();
    pending.set('slow', slow);
    await act(async () => {
      root.render(draw('slow'));
      await Promise.resolve();
    });
    act(() => root.unmount());
    const publications = publish.mock.calls.length;
    await act(async () => {
      slow.resolve();
      await slow.promise;
    });

    expect(publish).toHaveBeenCalledTimes(publications);
  });

  it('keeps synchronous React SSR on lower without starting preparation', () => {
    const { Leaf, lowered, prepared } = fixture();

    expect(
      renderToStaticMarkup(
        <Layout runtime={{ preparation: 'async' }}>
          <Leaf value="ssr" />
        </Layout>,
      ),
    ).toContain('ssr');
    expect(lowered).toHaveBeenCalledOnce();
    expect(prepared).not.toHaveBeenCalled();
  });
});
