import type { CanonicalTheme } from '@retikz/core';
import { DEFAULT_RESOLVED_THEME } from '@retikz/core';

import type { GraphDefinitionRegistries } from '../../providers';
import type { IRGroup } from '../../schemas';
import { resolveGroupChildren } from '../graph';
import { resolveGraphTheme } from '../theme';
import type { CanonicalGroup } from './types';

/** 解析 Group 的 Graph-local context，同时保留 Group 自身呈现 Source */
export const resolveGroup = (
  source: IRGroup,
  options: GraphDefinitionRegistries,
  theme: CanonicalTheme = DEFAULT_RESOLVED_THEME,
): CanonicalGroup => ({
  source,
  children: resolveGroupChildren(source, options),
  shellAppearance: resolveGraphTheme(theme, options.graphThemeDefinitions).defaults.group ?? {},
});
