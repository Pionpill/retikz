import { ThemeStyle } from '@retikz/core';
import { BrushCleaning, Feather, GraduationCap, Sparkles } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { PreviewThemeStyleOptions } from '../../src/modules/docs/components/component-preview/theme';

import { getPreviewThemeStyleIcon, isPreviewThemeStyleDocument } from '../../src/app/header/preview-theme-settings';

describe('preview theme settings icons', () => {
  it('maps each ThemeStyle to its semantic icon', () => {
    expect(getPreviewThemeStyleIcon(ThemeStyle.Neutral)).toBe(Feather);
    expect(getPreviewThemeStyleIcon(ThemeStyle.Academic)).toBe(GraduationCap);
    expect(getPreviewThemeStyleIcon(ThemeStyle.Vibrant)).toBe(Sparkles);
    expect(getPreviewThemeStyleIcon(ThemeStyle.Clean)).toBe(BrushCleaning);
  });

  it('exposes four flat style options only for viz table, chart, and plot docs', () => {
    expect(PreviewThemeStyleOptions).toEqual([
      ThemeStyle.Neutral,
      ThemeStyle.Academic,
      ThemeStyle.Vibrant,
      ThemeStyle.Clean,
    ]);
    expect(isPreviewThemeStyleDocument('viz', 'table')).toBe(true);
    expect(isPreviewThemeStyleDocument('viz', 'chart')).toBe(true);
    expect(isPreviewThemeStyleDocument('viz', 'plot')).toBe(true);
    expect(isPreviewThemeStyleDocument('kernel', 'table')).toBe(false);
    expect(isPreviewThemeStyleDocument('viz', 'standard')).toBe(false);
    expect(isPreviewThemeStyleDocument(undefined, null)).toBe(false);
  });
});
