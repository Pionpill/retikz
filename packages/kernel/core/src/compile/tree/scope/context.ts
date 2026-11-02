import type { PropertyPath } from '@retikz/foundation';
import { formatPropertyPath } from '@retikz/foundation';

import { DEFAULT_RESOLVED_THEME, resolveScopeDefaults, resolveTheme } from '../../../resolve';
import type { IRScope } from '../../../schemas';
import type { SharedCompileContext, ElementCompileContext } from '../../context';

/** 解析 Scope 子元素继承上下文；不编译 children 或聚合几何 */
export const resolveScopeContext = (
  scope: Pick<IRScope, 'defaults' | 'theme'>,
  shared: SharedCompileContext,
  parent?: ElementCompileContext,
  irPath: PropertyPath = [],
): ElementCompileContext =>
  Object.freeze({
    defaults: resolveScopeDefaults(scope.defaults, parent?.defaults),
    theme: resolveTheme(
      parent?.theme ?? DEFAULT_RESOLVED_THEME,
      scope.theme,
      formatPropertyPath([...irPath, 'theme']),
      shared.registries.themeRegistry,
    ),
  });
