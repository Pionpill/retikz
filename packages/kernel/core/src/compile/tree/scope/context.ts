import type { PropertyPath } from '@retikz/foundation';
import { formatPropertyPath } from '@retikz/foundation';

import { DEFAULT_RESOLVED_THEME, resolveScopeDefaults, resolveTheme } from '../../../resolve';
import type { IRScope } from '../../../schemas';
import type { SharedCompileContext } from '../../runtime';
import type { CompileStyle } from '../shared';

/** 解析 Scope 子元素的有效样式配置；不编译 children 或聚合几何 */
export const resolveScopeStyle = (
  scope: Pick<IRScope, 'defaults' | 'theme'>,
  shared: SharedCompileContext,
  parent?: CompileStyle,
  irPath: PropertyPath = [],
): CompileStyle =>
  Object.freeze({
    defaults: resolveScopeDefaults(scope.defaults, parent?.defaults),
    theme: resolveTheme(
      parent?.theme ?? DEFAULT_RESOLVED_THEME,
      scope.theme,
      formatPropertyPath([...irPath, 'theme']),
      shared.registries.themeRegistry,
    ),
  });
