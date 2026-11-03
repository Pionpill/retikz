import type { PropertyPath } from '@retikz/foundation';
import { formatPropertyPath } from '@retikz/foundation';

import type { ThemeDefinition } from '../../contract';
import type { ProviderRegistry } from '../../providers';
import type { IRScope } from '../../schemas';
import type { CanonicalTheme } from '../../shared';
import { DEFAULT_RESOLVED_THEME, resolveTheme } from '../theme';
import { resolveScopeDefaults } from './defaults';
import type { MergedScopeDefaults } from './types';

/** 作用域内生效的默认配置与主题 */
export type ScopeStyleResolution = Readonly<{
  /** 合并后的默认配置 */
  defaults: MergedScopeDefaults;
  /** 已解析的主题 */
  theme: CanonicalTheme;
}>;

/** 解析 Scope 子元素的有效样式配置；不编译 children 或聚合几何 */
export const resolveScopeStyle = (
  scope: Pick<IRScope, 'defaults' | 'theme'>,
  themeRegistry: ProviderRegistry<ThemeDefinition>,
  parent?: ScopeStyleResolution,
  irPath: PropertyPath = [],
  themePath = formatPropertyPath([...irPath, 'theme']),
): ScopeStyleResolution =>
  Object.freeze({
    defaults: resolveScopeDefaults(scope.defaults, parent?.defaults),
    theme: resolveTheme(parent?.theme ?? DEFAULT_RESOLVED_THEME, scope.theme, themePath, themeRegistry),
  });
