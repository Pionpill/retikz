import type { ResolvedTheme } from '@retikz/core';

import { ThemeMode } from '@retikz/core';

import type { IRDiagramDefaults } from '../../schemas';

/** 从当前 Core Theme 建立 Diagram Neutral defaults */
export const getDefaultDiagramTheme = (theme: ResolvedTheme): IRDiagramDefaults => ({
  frame: {
    padding: 16,
    titleDescriptionGap: 6,
    headingMainGap: 16,
    drawingLegendGap: 16,
    cornerRadius: 0,
  },
  presentation: {
    title: {
      style: {
        textColor: theme.mode === ThemeMode.Dark ? '#ffffff' : '#000000',
        opacity: 1,
        font: { size: 18, weight: 600 },
      },
      layout: { align: 'start', lineHeight: 22 },
    },
    description: {
      style: {
        textColor: theme.colors.semantic.guide,
        opacity: 1,
        font: { size: 14, weight: 400 },
      },
      layout: { align: 'start', lineHeight: 20 },
    },
  },
});
