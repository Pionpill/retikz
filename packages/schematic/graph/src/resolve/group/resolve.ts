import type { ResolvedTheme } from '@retikz/core';

import { DEFAULT_RESOLVED_THEME } from '@retikz/core';

import type { ResolvedGraphDefinitionOptions } from '../../providers';
import type { IRGroup } from '../../schemas';
import type { CanonicalGroup } from './types';

import { resolveGroupChildren } from '../graph';
import { resolveGraphTheme } from '../theme';

/** 解析 Group 的 Graph-local context，同时保留 Group 自身呈现 Source */
export const resolveGroup = (
  source: IRGroup,
  options: ResolvedGraphDefinitionOptions,
  theme: ResolvedTheme = DEFAULT_RESOLVED_THEME,
): CanonicalGroup => ({
  source,
  children: resolveGroupChildren(source, options),
  shellAppearance: resolveGraphTheme(theme, options.graphThemeStyles).group.tokens,
});
