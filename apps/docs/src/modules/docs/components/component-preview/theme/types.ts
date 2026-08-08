import type { ResolvedThemeColors } from '@retikz/core';

/** ComponentPreview 支持的颜色系列 ID */
export const PreviewColorScheme = {
  Category10: 'category10',
  Accent: 'accent',
  Dark2: 'dark2',
  Observable10: 'observable10',
  Paired: 'paired',
  Pastel1: 'pastel1',
  Pastel2: 'pastel2',
  Set1: 'set1',
  Set2: 'set2',
  Set3: 'set3',
  Tableau10: 'tableau10',
} as const;

export type PreviewColorSchemeValue = (typeof PreviewColorScheme)[keyof typeof PreviewColorScheme];

/** ComponentPreview 可编辑的 Core shared semantic colors */
export type PreviewSharedColors = ResolvedThemeColors['semantic'];
