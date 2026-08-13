// @vitest-environment jsdom

import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import i18n from '../../src/i18n';
import {
  PreviewContextBar,
  PreviewThemeBoundary,
} from '../../src/modules/docs/components/component-preview/context-bar';
import { PreviewThemeStyle } from '../../src/modules/docs/components/component-preview/theme';

beforeAll(async () => {
  await i18n.changeLanguage('zh');
});

afterEach(() => {
  document.body.replaceChildren();
});

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, PointerEvent: MouseEvent });

describe('PreviewContextBar', () => {
  it('仅渲染系统、亮色与暗色三个 shadcn toggle', () => {
    const markup = renderToStaticMarkup(<PreviewContextBar themeMode="inherit" onThemeModeChange={() => undefined} />);

    expect(markup.match(/data-slot="toggle-group-item"/g)).toHaveLength(3);
    expect(markup).toContain('系统');
    expect(markup).toContain('亮色');
    expect(markup).toContain('暗色');
    expect(markup).not.toContain('自动（');
    expect(markup).not.toContain('data-slot="select-trigger"');
    expect(markup).not.toContain('lucide-rotate-ccw');
    expect(markup).not.toContain('border-b');
  });

  it('启用后在暗色 toggle 右侧追加纯图标 ThemeStyle 菜单', () => {
    const markup = renderToStaticMarkup(
      <PreviewContextBar
        themeMode="inherit"
        onThemeModeChange={() => undefined}
        enableThemeSwitch
        themeStyle={PreviewThemeStyle.Academic}
        themeStyleSelection="inherit"
        onThemeStyleChange={() => undefined}
      />,
    );

    expect(markup).toContain('aria-label="Theme style"');
    expect(markup).toContain('lucide-graduation-cap');
    expect(markup.indexOf('Preview theme dark')).toBeLessThan(markup.indexOf('aria-label="Theme style"'));
  });

  it('把 ThemeStyle 菜单显示为与明暗 ToggleGroup 分隔的独立按钮', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(() => {
      root.render(
        <PreviewContextBar
          themeMode="inherit"
          onThemeModeChange={() => undefined}
          enableThemeSwitch
          themeStyle={PreviewThemeStyle.Academic}
          themeStyleSelection="inherit"
          onThemeStyleChange={() => undefined}
        />,
      );
    });

    const actions = container.querySelector('[data-slot="preview-context-bar"] > div');
    const trigger = container.querySelector('[data-slot="dropdown-menu-trigger"]');
    expect(actions?.classList.contains('gap-2')).toBe(true);
    expect(trigger?.classList.contains('bg-background')).toBe(true);
    expect(trigger?.classList.contains('border-l-0')).toBe(false);
    expect(trigger?.classList.contains('rounded-l-none')).toBe(false);
    await act(() => root.unmount());
  });

  it('ThemeStyle 下拉打开后保持原上下文栏可见', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(() => {
      root.render(
        <PreviewContextBar
          themeMode="inherit"
          onThemeModeChange={() => undefined}
          enableThemeSwitch
          themeStyle={PreviewThemeStyle.Academic}
          themeStyleSelection="inherit"
          onThemeStyleChange={() => undefined}
        />,
      );
    });

    const contextBar = container.querySelector('[data-slot="preview-context-bar"]');
    const trigger = container.querySelector<HTMLButtonElement>('[data-slot="dropdown-menu-trigger"]');
    expect(trigger).not.toBeNull();
    await act(() => {
      trigger?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    });

    expect(trigger?.dataset.state).toBe('open');
    expect(contextBar?.classList.contains('opacity-100')).toBe(true);
    expect(contextBar?.classList.contains('pointer-events-auto')).toBe(true);
    await act(() => root.unmount());
  });

  it('为 light 与 dark 提供互斥的局部边界 class', () => {
    const light = renderToStaticMarkup(<PreviewThemeBoundary themeMode="light">Light</PreviewThemeBoundary>);
    const dark = renderToStaticMarkup(<PreviewThemeBoundary themeMode="dark">Dark</PreviewThemeBoundary>);

    expect(light).toContain('preview-theme-light');
    expect(light).not.toContain(' dark');
    expect(dark).toContain(' dark');
    expect(dark).not.toContain('preview-theme-light');
  });
});
