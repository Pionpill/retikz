// @vitest-environment jsdom

import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ModuleLandingPage } from '../src/modules/docs/components/module-landing';
import * as moduleLandingUtils from '../src/modules/docs/components/module-landing/utils';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../src/modules/docs/components/component-preview', () => ({
  ComponentPreview: () => <div data-preview />,
  DemoLocationContext: { Provider: ({ children }: { children: React.ReactNode }) => children },
}));

let containerWidth = 900;
let resizeObserverCallback: ResizeObserverCallback | undefined;
const roots: Array<Root> = [];

class ResizeObserverStub {
  constructor(callback: ResizeObserverCallback) {
    resizeObserverCallback = callback;
  }

  observe(target: Element): void {
    Object.defineProperty(target, 'clientWidth', { configurable: true, get: () => containerWidth });
  }

  disconnect(): void {}
}

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, ResizeObserver: ResizeObserverStub });

afterEach(() => {
  roots.splice(0).forEach(root => act(() => root.unmount()));
  resizeObserverCallback = undefined;
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe('<ModuleLandingPage>', () => {
  it('同一列数内调整宽度时不重新计算卡片位置', () => {
    const placementSpy = vi.spyOn(moduleLandingUtils, 'resolveModuleLandingPlacements');
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);

    act(() => {
      root.render(
        <ModuleLandingPage
          title="title"
          description="description"
          demos={[
            {
              id: 'demo',
              span: { columns: 1, rows: 1 },
              location: ['kernel'],
              preview: { files: 'demo' },
            },
          ]}
          footer={null}
        />,
      );
    });
    const initialCallCount = placementSpy.mock.calls.length;

    containerWidth = 920;
    act(() => resizeObserverCallback?.([], {} as ResizeObserver));

    expect(placementSpy).toHaveBeenCalledTimes(initialCallCount);
  });
});
