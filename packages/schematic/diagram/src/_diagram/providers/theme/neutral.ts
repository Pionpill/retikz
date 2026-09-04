import type { ResolvedTheme } from '@retikz/core';

import { ThemeMode } from '@retikz/core';

import type { EffectiveDiagramTheme } from '../../resolve/theme';

/** 解析 Diagram Neutral Theme baseline */
export const getDefaultDiagramTheme = (theme: ResolvedTheme): EffectiveDiagramTheme => ({
  frame: {
    padding: { top: 16, right: 16, bottom: 16, left: 16 },
    titleDescriptionGap: 6,
    headingMainGap: 16,
    drawingLegendGap: 16,
    cornerRadius: 0,
  },
  presentation: {
    title: {
      textColor: theme.mode === ThemeMode.Dark ? '#ffffff' : '#000000',
      opacity: 1,
      font: { size: 18, weight: 600 },
      align: 'start',
      lineHeight: 22,
    },
    description: {
      textColor: theme.colors.semantic.guide,
      opacity: 1,
      font: { size: 14, weight: 400 },
      align: 'start',
      lineHeight: 20,
    },
  },
});
