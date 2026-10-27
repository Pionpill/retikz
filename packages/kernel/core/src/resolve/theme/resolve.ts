import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import { resolveCoreThemeColors, resolveDefaultCoreThemeColors, resolveThemeRegistry } from '../../providers';
import type { IRTheme } from '../../schemas';
import type { ResolvedTheme } from '../../shared';
import { ThemeMode } from '../../shared';

/** 未指定主题名称时使用的浅色主题与默认配色 */
export const DEFAULT_RESOLVED_THEME: ResolvedTheme = Object.freeze({
  mode: ThemeMode.Light,
  colors: resolveDefaultCoreThemeColors(ThemeMode.Light),
});

/**
 * 将当前层的主题配置与父级合并，得到有效主题和配色
 * @description name 和 mode 未提供时分别继承父级；两者均未改变时直接返回父级对象，否则按合并后的配置重新计算配色
 * @param sparse 当前层提供的部分主题配置；省略时直接沿用父级
 * @param path 主题配置的 IR 路径，用于错误定位
 * @param definitions 可用的主题定义；省略时使用默认注册表
 * @throws 需要重新解析的主题名称未注册，或主题配色计算失败时抛出 RetikzCoreError
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
