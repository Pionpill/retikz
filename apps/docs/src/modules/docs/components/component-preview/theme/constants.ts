import type { ThemeModeValue } from '@retikz/core';
import type { LucideIcon } from 'lucide-react';

import { BrushCleaning, CircleDot, GraduationCap, Sparkles } from 'lucide-react';

/** 文档站维护的闭合 Theme style 选项 */
export const PreviewThemeStyle = {
  Default: 'default',
  Academic: 'academic',
  Vibrant: 'vibrant',
  Clean: 'clean',
} as const;

/** 文档站可选择的 Theme style */
export type PreviewThemeStyleValue = (typeof PreviewThemeStyle)[keyof typeof PreviewThemeStyle];

/** ComponentPreview 解析后的最小 Theme 选择器 */
export type PreviewTheme = {
  style?: Exclude<PreviewThemeStyleValue, typeof PreviewThemeStyle.Default>;
  mode: ThemeModeValue;
};

/** ComponentPreview 支持的 ThemeStyle 选项 */
export const PreviewThemeStyleOptions = [
  PreviewThemeStyle.Default,
  PreviewThemeStyle.Academic,
  PreviewThemeStyle.Vibrant,
  PreviewThemeStyle.Clean,
] as const satisfies ReadonlyArray<PreviewThemeStyleValue>;

/** ThemeStyle 对应的文档站图标 */
const previewThemeStyleIcons: Record<PreviewThemeStyleValue, LucideIcon> = {
  [PreviewThemeStyle.Default]: CircleDot,
  [PreviewThemeStyle.Academic]: GraduationCap,
  [PreviewThemeStyle.Vibrant]: Sparkles,
  [PreviewThemeStyle.Clean]: BrushCleaning,
};

/** ThemeStyle 对应的本地化文案 key */
export const PreviewThemeStyleLabelKeys = {
  [PreviewThemeStyle.Default]: 'preview.themeStyleDefault',
  [PreviewThemeStyle.Academic]: 'preview.themeStyleAcademic',
  [PreviewThemeStyle.Vibrant]: 'preview.themeStyleVibrant',
  [PreviewThemeStyle.Clean]: 'preview.themeStyleClean',
} as const;

/** 判断当前文档路由是否提供 ComponentPreview 主题风格切换 */
export const isPreviewThemeStyleDocument = (moduleId: string | null | undefined, sectionId?: string | null): boolean =>
  moduleId === 'viz' || (moduleId === 'schematic' && sectionId === 'graph');

/** 返回主题风格对应的图标组件 */
export const getPreviewThemeStyleIcon = (themeStyle: PreviewThemeStyleValue): LucideIcon =>
  previewThemeStyleIcons[themeStyle];

/** 根据 docs 偏好生成传给 Core 的 sparse Theme selector */
export const resolvePreviewTheme = (themeStyle: PreviewThemeStyleValue, themeMode: ThemeModeValue): PreviewTheme => ({
  ...(themeStyle === PreviewThemeStyle.Default ? {} : { style: themeStyle }),
  mode: themeMode,
});
