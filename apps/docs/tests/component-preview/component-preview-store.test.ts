// @vitest-environment jsdom
import { ThemeStyle } from '@retikz/core';
import { afterEach, describe, expect, it } from 'vitest';

import { PreviewColorScheme } from '../../src/modules/docs/components/component-preview/theme/types';
import { useComponentPreviewStore } from '../../src/modules/docs/store/useComponentPreviewStore';

const originalDefaultOpen = useComponentPreviewStore.getState().controlPanelDefaultOpen;
const originalThemeMode = useComponentPreviewStore.getState().themeMode;
const originalThemeStyle = useComponentPreviewStore.getState().themeStyle;
const originalColorScheme = useComponentPreviewStore.getState().colorScheme;
const originalSharedColors = useComponentPreviewStore.getState().sharedColors;
const originalRangePlaybackDuration = useComponentPreviewStore.getState().rangePlaybackDuration;

afterEach(() => {
  useComponentPreviewStore.getState().setControlPanelDefaultOpen(originalDefaultOpen);
  useComponentPreviewStore.getState().setThemeMode(originalThemeMode);
  useComponentPreviewStore.getState().setThemeStyle(originalThemeStyle);
  useComponentPreviewStore.getState().setColorScheme(originalColorScheme);
  for (const key of ['error', 'success', 'warning'] as const) {
    useComponentPreviewStore.getState().setSharedColor(key, originalSharedColors[key]);
  }
  useComponentPreviewStore.getState().setRangePlaybackDuration(originalRangePlaybackDuration);
});

describe('ComponentPreview store controls panel preference', () => {
  it('设置并切换默认打开状态', () => {
    useComponentPreviewStore.getState().setControlPanelDefaultOpen(true);
    expect(useComponentPreviewStore.getState().controlPanelDefaultOpen).toBe(true);

    useComponentPreviewStore.getState().toggleControlPanelDefaultOpen();
    expect(useComponentPreviewStore.getState().controlPanelDefaultOpen).toBe(false);
  });

  it('保存新预览实例的主题默认值', () => {
    expect(useComponentPreviewStore.getState().themeMode).toBe('inherit');

    useComponentPreviewStore.getState().setThemeMode('dark');
    expect(useComponentPreviewStore.getState().themeMode).toBe('dark');
  });

  it('stores the default range playback duration', () => {
    expect(useComponentPreviewStore.getState().rangePlaybackDuration).toBe(2000);

    useComponentPreviewStore.getState().setRangePlaybackDuration(500);
    expect(useComponentPreviewStore.getState().rangePlaybackDuration).toBe(500);
  });

  it('stores the global preview ThemeStyle and categorical scheme ID', () => {
    expect(useComponentPreviewStore.getState().themeStyle).toBe(ThemeStyle.Neutral);
    expect(useComponentPreviewStore.getState().colorScheme).toBe(PreviewColorScheme.Category10);

    useComponentPreviewStore.getState().setThemeStyle(ThemeStyle.Academic);
    useComponentPreviewStore.getState().setColorScheme(PreviewColorScheme.Tableau10);
    useComponentPreviewStore.getState().setSharedColor('warning', '#123456');

    expect(useComponentPreviewStore.getState().themeStyle).toBe(ThemeStyle.Academic);
    expect(useComponentPreviewStore.getState().colorScheme).toBe(PreviewColorScheme.Tableau10);
    expect(useComponentPreviewStore.getState().sharedColors.warning).toBe('#123456');
  });

  it('不保存 panel 宽度或实例级映射', () => {
    const state = useComponentPreviewStore.getState();

    expect(state).not.toHaveProperty('controlPanelSize');
    expect(state).not.toHaveProperty('controlPanelWidth');
    expect(state).not.toHaveProperty('controlPanelSizes');
    expect(state).not.toHaveProperty('controlPanelWidths');
  });
});
