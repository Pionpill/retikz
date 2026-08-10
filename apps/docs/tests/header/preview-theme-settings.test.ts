import { ThemeStyle } from '@retikz/core';
import { BrushCleaning, Feather, GraduationCap, Sparkles } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import {
  getPreviewThemeStyleIcon,
  isPreviewThemeStyleDocument,
  PreviewThemeStyleOptions,
} from '../../src/modules/docs/components/component-preview/theme';

describe('preview theme settings icons', () => {
  it('maps each ThemeStyle to its semantic icon', () => {
    expect(getPreviewThemeStyleIcon(ThemeStyle.Neutral)).toBe(Feather);
    expect(getPreviewThemeStyleIcon(ThemeStyle.Academic)).toBe(GraduationCap);
    expect(getPreviewThemeStyleIcon(ThemeStyle.Vibrant)).toBe(Sparkles);
    expect(getPreviewThemeStyleIcon(ThemeStyle.Clean)).toBe(BrushCleaning);
  });

  it('exposes four flat style options for every viz document', () => {
    expect(PreviewThemeStyleOptions).toEqual([
      ThemeStyle.Neutral,
      ThemeStyle.Academic,
      ThemeStyle.Vibrant,
      ThemeStyle.Clean,
    ]);
    expect(isPreviewThemeStyleDocument('viz')).toBe(true);
    expect(isPreviewThemeStyleDocument('kernel')).toBe(false);
    expect(isPreviewThemeStyleDocument(undefined)).toBe(false);
  });
});
