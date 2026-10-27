import type { CanonicalTheme } from '@retikz/core';
import { DEFAULT_RESOLVED_THEME } from '@retikz/core';

import type { GraphDefinitionRegistries } from '../../providers';
import type { IRBlock } from '../../schemas';
import { resolveBlockSource } from '../graph';
import { resolveGraphTheme } from '../theme';
import type { CanonicalBlock } from './types';

const DEFAULT_BLOCK_MIN_WIDTH = 240;

/** 解析 Block 的 Graph-local context 与布局默认值，同时保留 sparse Source */
export const resolveBlock = (
  source: IRBlock,
  options: GraphDefinitionRegistries,
  theme: CanonicalTheme = DEFAULT_RESOLVED_THEME,
): CanonicalBlock => {
  const resolvedSource = resolveBlockSource(source, options);
  return {
    source: resolvedSource,
    minWidth: resolvedSource.minWidth ?? DEFAULT_BLOCK_MIN_WIDTH,
    shellAppearance: resolveGraphTheme(theme, options.graphThemeDefinitions).defaults.block ?? {},
  };
};
