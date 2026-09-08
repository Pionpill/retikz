import type { ResolvedTheme } from '@retikz/core';

import type { GraphThemeStyleResolution } from '../../contract';
import type { ResolvedGraphDefinitionOptions } from '../../providers';
import type { IRGraphDefaults, IRGraphRule } from '../../schemas';

/** 当前 Core Theme 下确定的 Graph style baseline 与规则 */
export type GraphThemeResolution = GraphThemeStyleResolution;

/** Graph 作者层传递的稀疏 defaults 与有序 rules */
export type GraphAuthorLayer = Readonly<{
  /** 当前作用域的稀疏 Graph defaults */
  defaults?: IRGraphDefaults;
  /** 当前作用域的有序 Graph rules */
  rules?: ReadonlyArray<IRGraphRule>;
}>;

/** 单成员 appearance resolver 共享的 Theme 与 definition 上下文 */
export type GraphMemberAppearanceResolveContext = ResolvedGraphDefinitionOptions &
  Readonly<{
    theme: ResolvedTheme;
  }>;
