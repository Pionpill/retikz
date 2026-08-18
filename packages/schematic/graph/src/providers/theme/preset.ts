import type { ResolvedTheme } from '@retikz/core';

import { ThemeMode } from '@retikz/core';

import type { IRGraphThemeTokenResolution } from '../../schemas';

import { GraphThemeToken, GraphThemeTokenResolutionSchema } from '../../schemas';

/** 从当前 Core Theme 建立默认 Graph Entity token baseline */
export const getDefaultGraphThemePreset = (theme: ResolvedTheme): IRGraphThemeTokenResolution => {
  const foreground = theme.mode === ThemeMode.Light ? '#000000' : '#ffffff';
  return GraphThemeTokenResolutionSchema.parse({
    [GraphThemeToken.EntityColor]: foreground,
    [GraphThemeToken.EntityTextForeground]: 'currentColor',
    [GraphThemeToken.EntityFill]: 'none',
    [GraphThemeToken.EntityStroke]: 'currentColor',
    [GraphThemeToken.EntityStrokeWidth]: 1,
    [GraphThemeToken.EntityFillOpacity]: 1,
    [GraphThemeToken.EntityStrokeOpacity]: 1,
    [GraphThemeToken.EntityOpacity]: 1,
  });
};
