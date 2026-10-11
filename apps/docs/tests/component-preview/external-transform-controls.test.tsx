// @vitest-environment jsdom
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PreviewControlStateContext } from '../../src/modules/docs/components/component-preview/context';
import ExternalExecution from '../../src/modules/docs/contents/viz/data/transform/computation/external-execution';

describe('Data external execution documentation', () => {
  beforeEach(() => {
    Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it('mode and order controls preserve stable sorting without counter-driven reexecution', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    const render = async (mode: 'builtin' | 'external' | 'hybrid', order: 'ascending' | 'descending') => {
      await act(async () => {
        root.render(
          <PreviewControlStateContext.Provider
            value={{
              canonicalValues: { mode: 'hybrid', order: 'ascending' },
              values: { mode, order },
              setValue: () => undefined,
              applyValues: () => undefined,
              reset: () => undefined,
            }}
          >
            <ExternalExecution />
          </PreviewControlStateContext.Provider>,
        );
        await Promise.resolve();
      });
    };

    const items = () =>
      [...container.querySelectorAll('svg text')]
        .map(node => node.textContent)
        .filter(value => ['A', 'B', 'C', 'D'].includes(value));
    await render('builtin', 'ascending');
    expect(items()).toEqual(['B', 'C', 'D', 'A']);
    expect(container.querySelector('p')?.textContent).toContain('0');

    await render('external', 'ascending');
    expect(items()).toEqual(['B', 'C', 'D', 'A']);
    expect(container.querySelector('p')?.textContent).toContain('1');

    await render('hybrid', 'ascending');
    expect(items()).toEqual(['B', 'C', 'D', 'A']);
    expect(container.querySelector('p')?.textContent).toContain('2');

    await render('hybrid', 'descending');
    expect(items()).toEqual(['A', 'C', 'D', 'B']);
    expect(container.querySelector('p')?.textContent).toContain('3');

    act(() => root.unmount());
  });
});
