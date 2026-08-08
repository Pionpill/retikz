import { ThemeStyle } from '@retikz/core';
import { BrushCleaning, Feather, GraduationCap, Sparkles } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { getPreviewThemeStyleIcon } from '../../src/app/header/preview-theme-settings';

describe('preview theme settings icons', () => {
  it('maps each ThemeStyle to its semantic icon', () => {
    expect(getPreviewThemeStyleIcon(ThemeStyle.Neutral)).toBe(Feather);
    expect(getPreviewThemeStyleIcon(ThemeStyle.Academic)).toBe(GraduationCap);
    expect(getPreviewThemeStyleIcon(ThemeStyle.Vibrant)).toBe(Sparkles);
    expect(getPreviewThemeStyleIcon(ThemeStyle.Clean)).toBe(BrushCleaning);
  });
});
