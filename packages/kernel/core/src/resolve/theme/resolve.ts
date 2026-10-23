import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import { resolveCoreThemeColors, resolveDefaultCoreThemeColors, resolveThemeRegistry } from '../../providers/theme';
import type { IRTheme } from '../../schemas';
import type { ResolvedTheme } from '../../shared';
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
  definitions = resolveThemeRegistry(),
): ResolvedTheme => {
  if (sparse === undefined) return parent;

  const name = sparse.name ?? parent.name;
  const mode = sparse.mode ?? parent.mode;
  if (name === parent.name && mode === parent.mode) return parent;

  if (name === undefined) return Object.freeze({ mode, colors: resolveDefaultCoreThemeColors(mode) });

  const definition = definitions.get(name);
  if (definition === undefined)
    throw new RetikzCoreError(RetikzCoreErrorCode.Resolve, `Theme name '${name}' is not registered at ${path}.`);

  try {
    return Object.freeze({ name, mode, colors: resolveCoreThemeColors(mode, definition.resolve({ mode })) });
  } catch (cause) {
    throw new RetikzCoreError(RetikzCoreErrorCode.Resolve, `Theme name '${name}' resolution failed at ${path}.`, {
      cause,
    });
  }
};
