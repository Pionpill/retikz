// @vitest-environment jsdom

import type { Root } from 'react-dom/client';

import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DocLayout } from '@/modules/docs/layout';

vi.mock('@/modules/docs/layout/sidebar/AppSidebar', () => ({
  AppSidebar: () => null,
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const roots: Array<Root> = [];

const DocumentNavigator = () => {
  const navigate = useNavigate();

  return (
    <button type="button" onClick={() => navigate('/kernel/concepts/design/layers')}>
      Navigate to layers
    </button>
  );
};

afterEach(() => {
  roots.splice(0).forEach(root => act(() => root.unmount()));
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('<DocLayout>', () => {
  it('切换到另一篇文档时把窗口滚动位置重置到开头', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);

    act(() => {
      root.render(
        <MemoryRouter initialEntries={['/kernel/concepts/design/principles']}>
          <Routes>
            <Route element={<DocLayout />}>
              <Route path="*" element={<DocumentNavigator />} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );
    });
    scrollTo.mockClear();

    act(() => {
      container.querySelector('button')?.click();
    });

    expect(scrollTo).toHaveBeenCalledOnce();
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
  });
});
