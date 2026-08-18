import type { IRNode, ResolvedTheme } from '@retikz/core';

import type { ResolvedGraphDefinitionOptions } from '../../providers';
import type { IREntity } from '../../schemas';
import type { IRGraphEntityThemeTokenRules, IRGraphThemeTokenOverrides } from '../../schemas';

/** 一层 Graph-local Entity token 与 selector rules */
export type GraphEntityThemeTokenLayer = Readonly<{
  tokens?: IRGraphThemeTokenOverrides;
  tokenRules?: IRGraphEntityThemeTokenRules;
}>;

/** Entity presentation resolver 的窄上下文 */
export type EntityPresentationResolveContext = ResolvedGraphDefinitionOptions &
  Readonly<{
    theme: ResolvedTheme;
    inheritedVariant?: string;
    tokenLayers?: ReadonlyArray<GraphEntityThemeTokenLayer>;
  }>;

/** Graph Entity 确定化后的 presentation */
export type CanonicalEntityPresentation = Readonly<{
  source: IREntity;
  role: string;
  variant: string;
  node: IRNode;
}>;
