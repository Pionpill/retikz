import type { ResolvedTheme } from '@retikz/core';

import type { GraphThemeStyleDefinition } from '../../contract';
import type { GraphThemeResolution } from './types';

import { getDefaultGraphThemePreset } from '../../providers';
import { GraphEntityThemeTokenRulesSchema, GraphThemeTokenResolutionSchema } from '../../schemas';

/** 按当前 Core Theme style 解析完整 Graph baseline 与有序 rules */
export const resolveGraphTheme = (
  theme: ResolvedTheme,
  styles: ReadonlyMap<string, GraphThemeStyleDefinition>,
): GraphThemeResolution => {
  if (theme.style === undefined) return { tokens: getDefaultGraphThemePreset(theme), tokenRules: [] };
  const definition = styles.get(theme.style);
  if (definition === undefined) {
    throw new Error(
      `Graph theme style '${theme.style}' is not registered. Inject it through the graphThemeStyles option.`,
    );
  }
  const resolution = definition.resolve(theme);
  return {
    tokens: GraphThemeTokenResolutionSchema.parse(resolution.tokens),
    tokenRules: GraphEntityThemeTokenRulesSchema.parse(resolution.tokenRules ?? []),
  };
};
