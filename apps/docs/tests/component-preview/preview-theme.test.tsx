// @vitest-environment jsdom
import type { FC } from 'react';

import { ThemeStyle } from '@retikz/core';
import { useTheme } from '@retikz/react';
import {
  schemeAccent,
  schemeCategory10,
  schemeDark2,
  schemeObservable10,
  schemePaired,
  schemePastel1,
  schemePastel2,
  schemeSet1,
  schemeSet2,
  schemeSet3,
  schemeTableau10,
} from 'd3-scale-chromatic';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, describe, expect, it } from 'vitest';

import {
  PreviewColorScheme,
  PreviewColorSchemeColors,
  PreviewDefaultSharedColors,
  PreviewThemeProvider,
  resolvePreviewTheme,
} from '../../src/modules/docs/components/component-preview/theme';
import { useComponentPreviewStore } from '../../src/modules/docs/store';

const originalThemeStyle = useComponentPreviewStore.getState().themeStyle;
const originalColorScheme = useComponentPreviewStore.getState().colorScheme;
const originalSharedColors = useComponentPreviewStore.getState().sharedColors;

afterEach(() => {
  useComponentPreviewStore.getState().setThemeStyle(originalThemeStyle);
  useComponentPreviewStore.getState().setColorScheme(originalColorScheme);
  for (const key of ['error', 'success', 'warning'] as const) {
    useComponentPreviewStore.getState().setSharedColor(key, originalSharedColors[key]);
  }
  document.body.replaceChildren();
});

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe('ComponentPreview global theme', () => {
  it('writes the selected ThemeStyle as a Core selector', () => {
    expect(resolvePreviewTheme(ThemeStyle.Academic)).toEqual({ style: ThemeStyle.Academic });
  });

  it('maps every categorical selector to its d3-scale-chromatic array', () => {
    expect(PreviewColorSchemeColors[PreviewColorScheme.Category10]).toEqual(schemeCategory10);
    expect(PreviewColorSchemeColors[PreviewColorScheme.Accent]).toEqual(schemeAccent);
    expect(PreviewColorSchemeColors[PreviewColorScheme.Dark2]).toEqual(schemeDark2);
    expect(PreviewColorSchemeColors[PreviewColorScheme.Observable10]).toEqual(schemeObservable10);
    expect(PreviewColorSchemeColors[PreviewColorScheme.Paired]).toEqual(schemePaired);
    expect(PreviewColorSchemeColors[PreviewColorScheme.Pastel1]).toEqual(schemePastel1);
    expect(PreviewColorSchemeColors[PreviewColorScheme.Pastel2]).toEqual(schemePastel2);
    expect(PreviewColorSchemeColors[PreviewColorScheme.Set1]).toEqual(schemeSet1);
    expect(PreviewColorSchemeColors[PreviewColorScheme.Set2]).toEqual(schemeSet2);
    expect(PreviewColorSchemeColors[PreviewColorScheme.Set3]).toEqual(schemeSet3);
    expect(PreviewColorSchemeColors[PreviewColorScheme.Tableau10]).toEqual(schemeTableau10);
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

  it('provides neutral light shared colors as the default', () => {
    expect(useComponentPreviewStore.getState().sharedColors).toEqual(PreviewDefaultSharedColors);
  });
});
