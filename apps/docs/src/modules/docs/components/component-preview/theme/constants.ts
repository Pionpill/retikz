import type { IRScene, ThemeStyleValue } from '@retikz/core';

import { ThemeStyle } from '@retikz/core';

/** ComponentPreview 支持的 ThemeStyle 选项 */
export const PreviewThemeStyleOptions = [
  ThemeStyle.Neutral,
  ThemeStyle.Academic,
  ThemeStyle.Vibrant,
  ThemeStyle.Clean,
] as const satisfies ReadonlyArray<ThemeStyleValue>;

/** 根据 docs 偏好生成传给 Core 的 sparse Theme selector */
export const resolvePreviewTheme = (themeStyle: ThemeStyleValue): IRScene['theme'] => ({ style: themeStyle });
