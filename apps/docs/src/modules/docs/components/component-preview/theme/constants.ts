import type { ThemeMode } from '@retikz/core';
import type { LucideIcon } from 'lucide-react';
import { BrushCleaning, CircleDot, GraduationCap, Sparkles } from 'lucide-react';

/** 文档站维护的闭合 Theme 选项 */
export const PreviewTheme = {
  Default: 'default',
  Academic: 'academic',
  Vibrant: 'vibrant',
  Clean: 'clean',
} as const;

/** 文档站可选择的 Theme */
export type PreviewThemeName = (typeof PreviewTheme)[keyof typeof PreviewTheme];

/** ComponentPreview 解析后的最小 Theme 选择器 */
export type PreviewTheme = {
  name?: Exclude<PreviewThemeName, typeof PreviewTheme.Default>;
  mode: ThemeMode;
};

/** ComponentPreview 支持的 Theme 选项 */
export const PreviewThemeOptions = [
  PreviewTheme.Default,
  PreviewTheme.Academic,
  PreviewTheme.Vibrant,
  PreviewTheme.Clean,
] as const satisfies ReadonlyArray<PreviewThemeName>;

/** Theme 对应的文档站图标 */
const previewThemeIcons: Record<PreviewThemeName, LucideIcon> = {
  [PreviewTheme.Default]: CircleDot,
  [PreviewTheme.Academic]: GraduationCap,
  [PreviewTheme.Vibrant]: Sparkles,
  [PreviewTheme.Clean]: BrushCleaning,
};

/** Theme 对应的本地化文案 key */
export const PreviewThemeLabelKeys = {
  [PreviewTheme.Default]: 'preview.themeNameDefault',
  [PreviewTheme.Academic]: 'preview.themeNameAcademic',
  [PreviewTheme.Vibrant]: 'preview.themeNameVibrant',
  [PreviewTheme.Clean]: 'preview.themeNameClean',
} as const;

/** 判断当前文档路由是否提供 ComponentPreview 主题风格切换 */
export const isPreviewThemeDocument = (moduleId: string | null | undefined): boolean => moduleId === 'viz';

/** 返回主题风格对应的图标组件 */
export const getPreviewThemeIcon = (themeName: PreviewThemeName): LucideIcon => previewThemeIcons[themeName];

/** 根据 docs 偏好生成传给 Core 的 sparse Theme selector */
export const resolvePreviewTheme = (themeName: PreviewThemeName, themeMode: ThemeMode): PreviewTheme => ({
  ...(themeName === PreviewTheme.Default ? {} : { name: themeName }),
  mode: themeMode,
});
