// @vitest-environment jsdom
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PreviewControlStateContext } from '../../src/modules/docs/components/component-preview/context';
import ExternalExecution from '../../src/modules/docs/contents/viz/data/transform/extensions/external-execution';

describe('Data external execution documentation', () => {
  beforeEach(() => {
    Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it('mode and factor controls compute actual Promise output without counter-driven reexecution', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const render = async (mode: 'builtin' | 'external' | 'hybrid', factor: number) => {
      await act(async () => {
        root.render(
          <PreviewControlStateContext.Provider
            value={{
              canonicalValues: { mode: 'hybrid', factor: 2 },
              values: { mode, factor },
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
    const points = () => [...container.querySelectorAll('ellipse')].map(point => point.outerHTML);
    await render('builtin', 2);
    const localPoints = points();
    expect(localPoints.length).toBeGreaterThan(0);
    expect(container.querySelector('p')?.textContent).toContain('0');

    await render('external', 2);
    expect(points()).toEqual(localPoints);
    expect(container.querySelector('p')?.textContent).toContain('1');
    await render('hybrid', 2);
    expect(points()).toEqual(localPoints);
    expect(container.querySelector('p')?.textContent).toContain('2');

    await render('hybrid', 3);
    expect(points()).not.toEqual(localPoints);
    expect(container.querySelector('p')?.textContent).toContain('3');
    act(() => root.unmount());
  });
});
