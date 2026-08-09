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

/** 判断当前文档是否提供全局主题风格设置 */
export const isPreviewThemeStyleDocument = (
  moduleId: string | undefined,
  sectionId: string | null | undefined,
): boolean => moduleId === 'viz' && (sectionId === 'table' || sectionId === 'chart' || sectionId === 'plot');
