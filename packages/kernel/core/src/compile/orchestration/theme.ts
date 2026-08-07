import type { AnyThemeTokenDefinition } from '../../contract';
import type { IRJsonObject, IRTheme } from '../../schemas';
import type { ResolvedTheme } from '../../shared';

import { resolveCoreThemeColors, resolveThemeTokenRegistry } from '../../providers/theme-token';
import { ThemeSchema } from '../../schemas';
import { ThemeMode, ThemeStyle } from '../../shared';
import { cloneAndFreezeJson } from '../../shared/json';

/** Theme token owner definition 的 identity registry */
export type ThemeTokenRegistry = ReadonlyMap<string, AnyThemeTokenDefinition>;

/** 没有显式 owner 注入时使用的 Core-only Theme token registry */
export const DEFAULT_THEME_TOKEN_REGISTRY: ThemeTokenRegistry = resolveThemeTokenRegistry();

/** Core compile 的冻结 Theme 基线 */
export const DEFAULT_RESOLVED_THEME: ResolvedTheme = Object.freeze({
  style: ThemeStyle.Neutral,
  mode: ThemeMode.Light,
  tokens: Object.freeze({}),
  colors: resolveCoreThemeColors(ThemeStyle.Neutral, ThemeMode.Light),
});

const formatThemeIssuePath = (path: string, issuePath: ReadonlyArray<PropertyKey>): string =>
  issuePath.length === 0 ? path : `${path}.${issuePath.map(String).join('.')}`;

const parseThemeTokens = (
  tokens: Readonly<Record<string, IRJsonObject>>,
  registry: ThemeTokenRegistry,
  path: string,
): Readonly<Record<string, IRJsonObject>> => {
  const resolved: Record<string, IRJsonObject> = { ...tokens };
  for (const [namespace, value] of Object.entries(tokens)) {
    const definition = registry.get(namespace);
    const namespacePath = `${path}.tokens.${namespace}`;
    if (definition === undefined) {
      throw new Error(`Invalid Theme at ${namespacePath}: unknown Theme token namespace "${namespace}".`);
    }
    const parsed = definition.schema.safeParse(value);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new Error(`Invalid Theme at ${formatThemeIssuePath(namespacePath, issue.path)}: ${issue.message}`, {
        cause: parsed.error,
      });
    }
    resolved[namespace] = cloneAndFreezeJson(parsed.data, namespacePath) as IRJsonObject;
  }
  return Object.freeze(resolved);
};

/**
 * 解析一层 sparse Theme 覆盖
 * @description 先验证通用 Theme，再按 registry 调用 owner schema，最后生成冻结的 namespace/token overlay
 */
export const resolveTheme = (
  parent: ResolvedTheme,
  sparse: IRTheme | undefined,
  path: string,
  registry: ThemeTokenRegistry = DEFAULT_THEME_TOKEN_REGISTRY,
): ResolvedTheme => {
  if (sparse === undefined) return parent;
  const parsed = ThemeSchema.safeParse(sparse);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const issueSegments = issue.path.map(String);
    if (issue.code === 'unrecognized_keys') issueSegments.push(issue.keys[0]);
    const issuePath = issueSegments.length === 0 ? path : `${path}.${issueSegments.join('.')}`;
    throw new Error(`Invalid Theme at ${issuePath}: ${issue.message}`, {
      cause: parsed.error,
    });
  }

  const style = parsed.data.style ?? parent.style;
  const mode = parsed.data.mode ?? parent.mode;
  const layerTokens = parsed.data.tokens;
  if (layerTokens === undefined && style === parent.style && mode === parent.mode) return parent;

  const parsedLayerTokens = layerTokens === undefined ? parent.tokens : parseThemeTokens(layerTokens, registry, path);
  const mergedTokens: Record<string, IRJsonObject> = { ...parent.tokens };
  if (layerTokens !== undefined) {
    for (const namespace of Object.keys(parsedLayerTokens)) {
      const parentTokens = Object.hasOwn(parent.tokens, namespace) ? parent.tokens[namespace] : undefined;
      const layer = parsedLayerTokens[namespace];
      mergedTokens[namespace] = Object.freeze({ ...(parentTokens ?? {}), ...layer });
    }
  }
  const tokens = Object.freeze(mergedTokens);
  const coreTokens = Object.hasOwn(tokens, 'core') ? tokens.core : undefined;
  const colors =
    coreTokens === undefined ? resolveCoreThemeColors(style, mode) : resolveCoreThemeColors(style, mode, coreTokens);
  return Object.freeze({ style, mode, tokens, colors });
};
