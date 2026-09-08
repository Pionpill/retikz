// @vitest-environment jsdom

import type { Root } from 'react-dom/client';

import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, describe, expect, it } from 'vitest';

import { StaticCssColorCatalog } from '@/modules/docs/components/mdx-content/static-css-color-catalog';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const roots: Array<Root> = [];

const setInputValue = (input: HTMLInputElement, value: string): void => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

const renderCatalog = (): HTMLElement => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);

  act(() => {
    root.render(<StaticCssColorCatalog />);
  });

  return container;
};

afterEach(() => {
  roots.splice(0).forEach(root => act(() => root.unmount()));
  document.body.replaceChildren();
});

describe('<StaticCssColorCatalog>', () => {
  it('filters the package-provided named color manifest by name and hex value', () => {
    const container = renderCatalog();
    const searchInput = container.querySelector<HTMLInputElement>('input[type="search"]');
    const colorList = container.querySelector<HTMLElement>('[data-static-css-color-list]');

    expect(container.querySelectorAll('[data-static-css-color-card]')).toHaveLength(148);
    expect(searchInput).not.toBeNull();
    expect(colorList?.className).toContain('max-h-[500px]');
    expect(colorList?.className).toContain('overflow-y-auto');

    act(() => {
      if (searchInput) setInputValue(searchInput, 'rebeccapurple');
    });
    expect(container.querySelectorAll('[data-static-css-color-card]')).toHaveLength(1);
    expect(container.textContent).toContain('rebeccapurple');

    act(() => {
      if (searchInput) setInputValue(searchInput, '#ff8c00');
    });
    expect(container.querySelectorAll('[data-static-css-color-card]')).toHaveLength(1);
    expect(container.textContent).toContain('darkorange');
  });

  it('renders an immediate preview only for static CSS colors accepted by Foundation', () => {
    const container = renderCatalog();
    const searchInput = container.querySelector<HTMLInputElement>('input[type="search"]');

    act(() => {
      if (searchInput) setInputValue(searchInput, 'rgb(255 0 0 / 50%)');
    });
    expect(container.querySelector('[data-static-css-color-preview]')).not.toBeNull();

    act(() => {
      if (searchInput) setInputValue(searchInput, 'var(--accent)');
    });
    expect(container.querySelector('[data-static-css-color-preview]')).toBeNull();
  });
});
