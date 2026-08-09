// @vitest-environment jsdom
import type { FC } from 'react';

import { ThemeMode, ThemeStyle } from '@retikz/core';
import { useTheme } from '@retikz/react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, describe, expect, it } from 'vitest';

import { PreviewThemeProvider, resolvePreviewTheme } from '../../src/modules/docs/components/component-preview/theme';
import { useComponentPreviewStore } from '../../src/modules/docs/store';

const originalThemeStyle = useComponentPreviewStore.getState().themeStyle;

afterEach(() => {
  useComponentPreviewStore.getState().setThemeStyle(originalThemeStyle);
  document.body.replaceChildren();
});

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe('ComponentPreview global theme', () => {
  it('writes the selected ThemeStyle and ThemeMode as a Core selector', () => {
    expect(resolvePreviewTheme(ThemeStyle.Academic, ThemeMode.Dark)).toEqual({
      style: ThemeStyle.Academic,
      mode: ThemeMode.Dark,
    });
  });

  it('PreviewThemeProvider bridges persisted IDs to the React ambient Theme', () => {
    useComponentPreviewStore.getState().setThemeStyle(ThemeStyle.Clean);

    const ThemeReader: FC = () => {
      const theme = useTheme();
      return <output>{theme?.style}</output>;
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        <PreviewThemeProvider>
          <ThemeReader />
        </PreviewThemeProvider>,
      );
    });
    expect(container.textContent).toBe(ThemeStyle.Clean);
    act(() => root.unmount());
  });

  it('keeps an explicit preview ThemeStyle above later global changes', () => {
    useComponentPreviewStore.getState().setThemeStyle(ThemeStyle.Clean);

    const ThemeReader: FC = () => {
      const theme = useTheme();
      return <output>{theme?.style}</output>;
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        <PreviewThemeProvider themeStyle={ThemeStyle.Academic}>
          <ThemeReader />
        </PreviewThemeProvider>,
      );
    });
    expect(container.textContent).toBe(ThemeStyle.Academic);

    act(() => useComponentPreviewStore.getState().setThemeStyle(ThemeStyle.Vibrant));
    expect(container.textContent).toBe(ThemeStyle.Academic);
    act(() => root.unmount());
  });

  it('passes an explicit preview dark mode to the React ambient Theme', () => {
    const ThemeReader: FC = () => {
      const theme = useTheme();
      return <output>{theme?.mode}</output>;
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        <PreviewThemeProvider themeMode="dark">
          <ThemeReader />
        </PreviewThemeProvider>,
      );
    });
    expect(container.textContent).toBe('dark');
    act(() => root.unmount());
  });
});
