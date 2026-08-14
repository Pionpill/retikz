import type { IRTheme } from '../../schemas';
import type { ResolvedTheme } from '../../shared';

import { resolveDefaultCoreThemeColors, resolveThemeStyleRegistry } from '../../providers/theme';
import { ThemeMode } from '../../shared';

/** Core resolve 的 Theme 基线 */
export const DEFAULT_RESOLVED_THEME: ResolvedTheme = Object.freeze({
  mode: ThemeMode.Light,
  colors: resolveDefaultCoreThemeColors(ThemeMode.Light),
});

/**
 * 解析一层 sparse Theme 覆盖
 * @description 验证 Theme selector 后按字段继承，并重新生成共享 colors
 */
export const resolveTheme = (
  parent: ResolvedTheme,
  sparse: IRTheme | undefined,
  path: string,
  styles = resolveThemeStyleRegistry(),
): ResolvedTheme => {
  if (sparse === undefined) return parent;
  const style = sparse.style ?? parent.style;
  const mode = sparse.mode ?? parent.mode;
  if (style === parent.style && mode === parent.mode) return parent;

  if (style === undefined) return Object.freeze({ mode, colors: resolveDefaultCoreThemeColors(mode) });

  const definition = styles.get(style);
  if (definition === undefined) throw new Error(`Theme style '${style}' is not registered at ${path}.`);
  return Object.freeze({ style, mode, colors: definition.resolve({ mode }) });
};
