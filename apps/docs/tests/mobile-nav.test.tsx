// @vitest-environment jsdom

import type { ReactNode } from 'react';
import type { Root } from 'react-dom/client';

import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter, Navigate, Route, Routes, useNavigate } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MobileNav } from '../src/app/header/MobileNav';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/components/ui/button', () => ({
  buttonVariants: () => '',
}));

vi.mock('@/components/ui/sheet', async () => {
  const { createContext, useContext } = await import('react');
  const SheetOpenContext = createContext<(open: boolean) => void>(() => undefined);

  return {
    Sheet: (props: { children: ReactNode; open: boolean; onOpenChange: (open: boolean) => void }) => {
      const { children, open, onOpenChange } = props;
      return (
        <SheetOpenContext.Provider value={onOpenChange}>
          <div data-slot="mock-mobile-sheet" data-open={String(open)}>
            {children}
          </div>
        </SheetOpenContext.Provider>
      );
    },
    SheetTrigger: (props: { children: ReactNode; className?: string; 'aria-label'?: string }) => {
      const setOpen = useContext(SheetOpenContext);
      return (
        <button
          type="button"
          className={props.className}
          aria-label={props['aria-label']}
          onClick={() => setOpen(true)}
        >
          {props.children}
        </button>
      );
    },
    SheetContent: (props: { children: ReactNode; className?: string }) => (
      <div className={props.className}>{props.children}</div>
    ),
    SheetHeader: (props: { children: ReactNode; className?: string }) => (
      <div className={props.className}>{props.children}</div>
    ),
    SheetTitle: (props: { children: ReactNode }) => <div>{props.children}</div>,
  };
});

vi.mock('@/components/ui/toggle-group', async () => {
  const { createContext, useContext } = await import('react');
  const ToggleValueContext = createContext<(value: string) => void>(() => undefined);

  return {
    ToggleGroup: (props: { children: ReactNode; onValueChange: (value: string) => void }) => (
      <ToggleValueContext.Provider value={props.onValueChange}>
        <div>{props.children}</div>
      </ToggleValueContext.Provider>
    ),
    ToggleGroupItem: (props: { children: ReactNode; value: string; className?: string }) => {
      const onValueChange = useContext(ToggleValueContext);
      return (
        <button
          type="button"
          className={props.className}
          data-module-id={props.value}
          onClick={() => onValueChange(props.value)}
        >
          {props.children}
        </button>
      );
    },
  };
});

vi.mock('@/modules/docs/layout', () => ({
  AppSidebar: (props: { moduleId?: string; onNavigate?: () => void }) => {
    const navigate = useNavigate();
    return (
      <button
        type="button"
        aria-label="Mock article"
        onClick={() => {
          navigate(`/${props.moduleId}/components`);
          props.onNavigate?.();
        }}
      >
        Article
      </button>
    );
  },
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const roots: Array<Root> = [];

const renderMobileNav = (): HTMLElement => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);

  act(() => {
    root.render(
      <MemoryRouter initialEntries={['/kernel/introduction']}>
        <MobileNav />
        <Routes>
          <Route path="/viz" element={<Navigate to="/viz/introduction" replace />} />
          <Route path="*" element={null} />
        </Routes>
      </MemoryRouter>,
    );
  });

  return container;
};

const click = (element: Element | null): void => {
  expect(element).not.toBeNull();
  act(() => {
    element?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

afterEach(() => {
  roots.splice(0).forEach(root => act(() => root.unmount()));
  document.body.replaceChildren();
});

describe('MobileNav', () => {
  it('固定显示文档站品牌且不展示模块版本', () => {
    const container = renderMobileNav();

    click(container.querySelector('button[aria-label="Open navigation"]'));

    expect(container.querySelector('a[aria-label="retikz home"]')?.textContent).toBe('retikz.doc');
  });

  it('切换顶部模块后保持抽屉打开', () => {
    const container = renderMobileNav();

    click(container.querySelector('button[aria-label="Open navigation"]'));
    click(container.querySelector('button[data-module-id="viz"]'));

    expect(container.querySelector('[data-slot="mock-mobile-sheet"]')?.getAttribute('data-open')).toBe('true');
  });

  it('点击具体文章后关闭抽屉', () => {
    const container = renderMobileNav();

    click(container.querySelector('button[aria-label="Open navigation"]'));
    click(container.querySelector('button[aria-label="Mock article"]'));

    expect(container.querySelector('[data-slot="mock-mobile-sheet"]')?.getAttribute('data-open')).toBe('false');
  });
});
