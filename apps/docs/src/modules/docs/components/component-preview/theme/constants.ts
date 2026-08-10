import type { ThemeModeValue, ThemeStyleValue } from '@retikz/core';
import type { LucideIcon } from 'lucide-react';

import { ThemeStyle } from '@retikz/core';
import { BrushCleaning, Feather, GraduationCap, Sparkles } from 'lucide-react';

/** ComponentPreview 解析后的最小 Theme 选择器 */
export type PreviewTheme = {
  style: ThemeStyleValue;
  mode: ThemeModeValue;
};

/** ComponentPreview 支持的 ThemeStyle 选项 */
export const PreviewThemeStyleOptions = [
  ThemeStyle.Neutral,
  ThemeStyle.Academic,
  ThemeStyle.Vibrant,
  ThemeStyle.Clean,
] as const satisfies ReadonlyArray<ThemeStyleValue>;

/** ThemeStyle 对应的文档站图标 */
const previewThemeStyleIcons: Record<ThemeStyleValue, LucideIcon> = {
  [ThemeStyle.Neutral]: Feather,
  [ThemeStyle.Academic]: GraduationCap,
  [ThemeStyle.Vibrant]: Sparkles,
  [ThemeStyle.Clean]: BrushCleaning,
};

/** ThemeStyle 对应的本地化文案 key */
export const PreviewThemeStyleLabelKeys = {
  [ThemeStyle.Neutral]: 'preview.themeStyleNeutral',
  [ThemeStyle.Academic]: 'preview.themeStyleAcademic',
  [ThemeStyle.Vibrant]: 'preview.themeStyleVibrant',
  [ThemeStyle.Clean]: 'preview.themeStyleClean',
} as const;

/** 返回主题风格对应的图标组件 */
export const getPreviewThemeStyleIcon = (themeStyle: ThemeStyleValue): LucideIcon => previewThemeStyleIcons[themeStyle];

/** 根据 docs 偏好生成传给 Core 的 sparse Theme selector */
export const resolvePreviewTheme = (themeStyle: ThemeStyleValue, themeMode: ThemeModeValue): PreviewTheme => ({
  style: themeStyle,
  mode: themeMode,
});
