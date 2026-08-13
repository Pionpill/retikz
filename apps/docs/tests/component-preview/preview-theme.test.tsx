// @vitest-environment jsdom
import type { FC } from 'react';

import { ScatterChart } from '@retikz/chart-react/point';
import { ThemeMode } from '@retikz/core';
import { useTheme } from '@retikz/react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { act } from 'react-dom/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  PreviewDetailTable,
  PreviewThemeProvider,
  PreviewThemeStyle,
  resolvePreviewTheme,
} from '../../src/modules/docs/components/component-preview/theme';
import { useComponentPreviewStore } from '../../src/modules/docs/store';

const originalThemeStyle = useComponentPreviewStore.getState().themeStyle;

afterEach(() => {
  vi.restoreAllMocks();
  useComponentPreviewStore.getState().setThemeStyle(originalThemeStyle);
  document.body.replaceChildren();
});

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe('ComponentPreview global theme', () => {
  it('writes the selected ThemeStyle and ThemeMode as a Core selector', () => {
    expect(resolvePreviewTheme(PreviewThemeStyle.Academic, ThemeMode.Dark)).toEqual({
      style: PreviewThemeStyle.Academic,
      mode: ThemeMode.Dark,
    });
  });

  it('omits style when the docs default option is selected', () => {
    expect(resolvePreviewTheme(PreviewThemeStyle.Default, ThemeMode.Light)).toEqual({ mode: ThemeMode.Light });
  });

  it('PreviewThemeProvider bridges persisted IDs to the React ambient Theme', () => {
    useComponentPreviewStore.getState().setThemeStyle(PreviewThemeStyle.Clean);

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
    expect(container.textContent).toBe(PreviewThemeStyle.Clean);
    act(() => root.unmount());
  });

  it('keeps the Core default baseline when an explicit preview theme omits style', () => {
    useComponentPreviewStore.getState().setThemeStyle(PreviewThemeStyle.Vibrant);

    const ThemeReader: FC = () => {
      const theme = useTheme();
      return <output>{theme?.style ?? 'default'}</output>;
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        <PreviewThemeProvider theme={{ mode: ThemeMode.Light }}>
          <ThemeReader />
        </PreviewThemeProvider>,
      );
    });
    expect(container.textContent).toBe('default');
    act(() => root.unmount());
  });

  it('keeps an explicit preview ThemeStyle above later global changes', () => {
    useComponentPreviewStore.getState().setThemeStyle(PreviewThemeStyle.Clean);

    const ThemeReader: FC = () => {
      const theme = useTheme();
      return <output>{theme?.style}</output>;
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        <PreviewThemeProvider theme={{ style: PreviewThemeStyle.Academic, mode: ThemeMode.Light }}>
          <ThemeReader />
        </PreviewThemeProvider>,
      );
    });
    expect(container.textContent).toBe(PreviewThemeStyle.Academic);

    act(() => useComponentPreviewStore.getState().setThemeStyle(PreviewThemeStyle.Vibrant));
    expect(container.textContent).toBe(PreviewThemeStyle.Academic);
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
        <PreviewThemeProvider theme={{ mode: ThemeMode.Dark }}>
          <ThemeReader />
        </PreviewThemeProvider>,
      );
    });
    expect(container.textContent).toBe('dark');
    act(() => root.unmount());
  });

  it('renders a standalone preview Table without registering docs definitions twice', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    expect(() =>
      renderToStaticMarkup(
        <PreviewThemeProvider theme={{ style: PreviewThemeStyle.Academic, mode: ThemeMode.Light }}>
          <PreviewDetailTable
            id="preview-table"
            dataRef="people"
            data={[{ name: 'Ada' }]}
            columns={[{ id: 'name', field: 'name' }]}
          />
        </PreviewThemeProvider>,
      ),
    ).not.toThrow();
  });

  it('makes the selected Chart ThemeStyle available to standalone Chart previews', () => {
    expect(() =>
      renderToStaticMarkup(
        <PreviewThemeProvider theme={{ style: PreviewThemeStyle.Vibrant, mode: ThemeMode.Light }}>
          <ScatterChart
            data={[{ income: 12000, life: 74 }]}
            encoding={{ x: { field: 'income' }, y: { field: 'life' } }}
          />
        </PreviewThemeProvider>,
      ),
    ).not.toThrow();
  });
});
