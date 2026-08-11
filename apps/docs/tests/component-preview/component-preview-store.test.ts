// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { PreviewThemeStyle } from '../../src/modules/docs/components/component-preview/theme';
import { useComponentPreviewStore } from '../../src/modules/docs/store/useComponentPreviewStore';

const originalDefaultOpen = useComponentPreviewStore.getState().controlPanelDefaultOpen;
const originalThemeMode = useComponentPreviewStore.getState().themeMode;
const originalThemeStyle = useComponentPreviewStore.getState().themeStyle;
const originalRangePlaybackDuration = useComponentPreviewStore.getState().rangePlaybackDuration;

afterEach(() => {
  useComponentPreviewStore.getState().setControlPanelDefaultOpen(originalDefaultOpen);
  useComponentPreviewStore.getState().setThemeMode(originalThemeMode);
  useComponentPreviewStore.getState().setThemeStyle(originalThemeStyle);
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

  it('stores the global preview ThemeStyle', () => {
    expect(useComponentPreviewStore.getState().themeStyle).toBe(PreviewThemeStyle.Neutral);

    useComponentPreviewStore.getState().setThemeStyle(PreviewThemeStyle.Academic);

    expect(useComponentPreviewStore.getState().themeStyle).toBe(PreviewThemeStyle.Academic);
  });

  it('不保存 panel 宽度或实例级映射', () => {
    const state = useComponentPreviewStore.getState();

    expect(state).not.toHaveProperty('controlPanelSize');
    expect(state).not.toHaveProperty('controlPanelWidth');
    expect(state).not.toHaveProperty('controlPanelSizes');
    expect(state).not.toHaveProperty('controlPanelWidths');
  });
});
