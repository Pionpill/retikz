import type { ThemeStyleValue } from '@retikz/core';
import type { LucideIcon } from 'lucide-react';

import { ThemeStyle } from '@retikz/core';
import { BrushCleaning, Feather, GraduationCap, Sparkles } from 'lucide-react';

const previewThemeStyleIcons: Record<ThemeStyleValue, LucideIcon> = {
  [ThemeStyle.Neutral]: Feather,
  [ThemeStyle.Academic]: GraduationCap,
  [ThemeStyle.Vibrant]: Sparkles,
  [ThemeStyle.Clean]: BrushCleaning,
};

/** 返回主题风格对应的图标组件 */
export const getPreviewThemeStyleIcon = (themeStyle: ThemeStyleValue): LucideIcon => previewThemeStyleIcons[themeStyle];
