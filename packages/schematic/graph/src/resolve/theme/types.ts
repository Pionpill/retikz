import type { ResolvedTheme } from '@retikz/core';

import type { GraphThemeStyleResolution } from '../../contract';
import type { ResolvedGraphDefinitionOptions } from '../../providers';
import type { IRGraphThemeLayer } from '../../schemas';

/** 当前 Core Theme 下确定的 Graph style baseline 与规则 */
export type GraphThemeResolution = GraphThemeStyleResolution;

/** 单成员 structure / appearance resolver 共享的 Theme 与 definition 上下文 */
export type GraphMemberAppearanceResolveContext = ResolvedGraphDefinitionOptions &
  Readonly<{
    theme: ResolvedTheme;
    layers?: ReadonlyArray<IRGraphThemeLayer>;
  }>;
