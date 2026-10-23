import { BrushCleaning, CircleDot, GraduationCap, Sparkles } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import {
  getPreviewThemeIcon,
  isPreviewThemeDocument,
  PreviewTheme,
  PreviewThemeOptions,
} from '../../src/modules/docs/components/component-preview/theme';

describe('preview theme settings icons', () => {
  it('maps each Theme to its semantic icon', () => {
    expect(getPreviewThemeIcon(PreviewTheme.Default)).toBe(CircleDot);
    expect(getPreviewThemeIcon(PreviewTheme.Academic)).toBe(GraduationCap);
    expect(getPreviewThemeIcon(PreviewTheme.Vibrant)).toBe(Sparkles);
    expect(getPreviewThemeIcon(PreviewTheme.Clean)).toBe(BrushCleaning);
  });

  it('exposes four flat style options for Viz docs', () => {
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
