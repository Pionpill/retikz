// @vitest-environment jsdom

import type { Root } from 'react-dom/client';

import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ModuleNav } from '../src/app/header/ModuleNav';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const roots: Array<Root> = [];

afterEach(() => {
  roots.splice(0).forEach(root => act(() => root.unmount()));
  document.body.replaceChildren();
});

describe('<ModuleNav>', () => {
  it('当前模块使用选中文字色', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);

    act(() => {
      root.render(
        <MemoryRouter initialEntries={['/kernel/concepts/design/principles']}>
          <Routes>
            <Route path=":moduleId/*" element={<ModuleNav />} />
          </Routes>
        </MemoryRouter>,
      );
    });
    const activeLink = container.querySelector<HTMLAnchorElement>('a[data-active][href="/kernel"]');

    expect(activeLink).not.toBeNull();
    expect(activeLink?.classList.contains('text-foreground')).toBe(true);
    expect(activeLink?.classList.contains('text-muted-foreground')).toBe(false);
  });
});
