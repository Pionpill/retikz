// @vitest-environment jsdom

import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';

import i18n from '../../src/i18n';
import {
  PreviewContextBar,
  PreviewThemeBoundary,
} from '../../src/modules/docs/components/component-preview/context-bar';

beforeAll(async () => {
  await i18n.changeLanguage('zh');
});

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

  it('为 light 与 dark 提供互斥的局部边界 class', () => {
    const light = renderToStaticMarkup(<PreviewThemeBoundary themeMode="light">Light</PreviewThemeBoundary>);
    const dark = renderToStaticMarkup(<PreviewThemeBoundary themeMode="dark">Dark</PreviewThemeBoundary>);

    expect(light).toContain('preview-theme-light');
    expect(light).not.toContain(' dark');
    expect(dark).toContain(' dark');
    expect(dark).not.toContain('preview-theme-light');
  });
});
