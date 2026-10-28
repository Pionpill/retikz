import { BrushCleaning, CircleDot, GraduationCap, Sparkles } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import {
  getPreviewThemeIcon,
  isPreviewThemeDocument,
  PreviewTheme,
  PreviewThemeOptions,
} from '../../src/modules/docs/components/component-preview/theme';

describe('预览主题设置图标', () => {
  it('将每个主题映射到其语义图标', () => {
    expect(getPreviewThemeIcon(PreviewTheme.Default)).toBe(CircleDot);
    expect(getPreviewThemeIcon(PreviewTheme.Academic)).toBe(GraduationCap);
    expect(getPreviewThemeIcon(PreviewTheme.Vibrant)).toBe(Sparkles);
    expect(getPreviewThemeIcon(PreviewTheme.Clean)).toBe(BrushCleaning);
  });

  it('为 Viz 文档公开四个平面样式选项', () => {
    expect(PreviewThemeOptions).toEqual([
      PreviewTheme.Default,
      PreviewTheme.Academic,
      PreviewTheme.Vibrant,
      PreviewTheme.Clean,
    ]);
    expect(isPreviewThemeDocument('viz')).toBe(true);
    expect(isPreviewThemeDocument('schematic')).toBe(false);
    expect(isPreviewThemeDocument('kernel')).toBe(false);
    expect(isPreviewThemeDocument(undefined)).toBe(false);
  });
});
