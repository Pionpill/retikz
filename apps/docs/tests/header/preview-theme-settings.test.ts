import { BrushCleaning, Feather, GraduationCap, Sparkles } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import {
  getPreviewThemeStyleIcon,
  isPreviewThemeStyleDocument,
  PreviewThemeStyle,
  PreviewThemeStyleOptions,
} from '../../src/modules/docs/components/component-preview/theme';

describe('preview theme settings icons', () => {
  it('maps each ThemeStyle to its semantic icon', () => {
    expect(getPreviewThemeStyleIcon(PreviewThemeStyle.Default)).toBe(Feather);
    expect(getPreviewThemeStyleIcon(PreviewThemeStyle.Academic)).toBe(GraduationCap);
    expect(getPreviewThemeStyleIcon(PreviewThemeStyle.Vibrant)).toBe(Sparkles);
    expect(getPreviewThemeStyleIcon(PreviewThemeStyle.Clean)).toBe(BrushCleaning);
  });

  it('exposes four flat style options for Viz docs', () => {
    expect(PreviewThemeStyleOptions).toEqual([
      PreviewThemeStyle.Default,
      PreviewThemeStyle.Academic,
      PreviewThemeStyle.Vibrant,
      PreviewThemeStyle.Clean,
    ]);
    expect(isPreviewThemeStyleDocument('viz')).toBe(true);
    expect(isPreviewThemeStyleDocument('diagram')).toBe(false);
    expect(isPreviewThemeStyleDocument('kernel')).toBe(false);
    expect(isPreviewThemeStyleDocument(undefined)).toBe(false);
  });
});
