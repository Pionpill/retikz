import type { ResolvedTheme } from '@retikz/core';
import type { WithRequiredProperties } from '@retikz/foundation';

import type {
  IRGraphEntityAppearanceTokenOverrides,
  IRGraphEntityThemeRule,
  IRGraphRelationAppearanceTokenOverrides,
  IRGraphRelationThemeRule,
} from '../../schemas';

/** Graph Theme style 的完整 Entity 基础 appearance 与可选效果字段 */
export type GraphEntityThemeStyleTokens = WithRequiredProperties<
  IRGraphEntityAppearanceTokenOverrides,
  'color' | 'textColor' | 'fill' | 'stroke' | 'fillOpacity' | 'strokeWidth' | 'strokeOpacity' | 'opacity'
>;

/** Graph Theme style 的完整 Relation appearance baseline */
export type GraphRelationThemeStyleTokens = WithRequiredProperties<
  IRGraphRelationAppearanceTokenOverrides,
  'color' | 'stroke' | 'strokeWidth' | 'strokeOpacity' | 'opacity' | 'labelTextForeground' | 'labelOpacity'
>;

/** Graph Theme style 解析后的 Entity 与 Relation baseline 与有序规则 */
export type GraphThemeStyleResolution = Readonly<{
  /** Entity-owned style baseline 与规则 */
  entity: Readonly<{
    tokens: GraphEntityThemeStyleTokens;
    rules?: ReadonlyArray<IRGraphEntityThemeRule>;
  }>;
  /** Relation-owned style baseline 与规则 */
  relation: Readonly<{
    tokens: GraphRelationThemeStyleTokens;
    rules?: ReadonlyArray<IRGraphRelationThemeRule>;
  }>;
}>;

/** Graph Theme style 作者相对默认 preset 提供的稀疏覆盖 */
export type GraphThemeStyleOverrides = Readonly<{
  /** 可选 Entity appearance 与追加规则 */
  entity?: Readonly<{
    /** 相对默认 Entity tokens 的稀疏覆盖 */
    tokens?: IRGraphEntityAppearanceTokenOverrides;
    /** 追加在默认 Entity rules 后的有序规则 */
    rules?: ReadonlyArray<IRGraphEntityThemeRule>;
  }>;
  /** 可选 Relation appearance 与追加规则 */
  relation?: Readonly<{
    /** 相对默认 Relation tokens 的稀疏覆盖 */
    tokens?: IRGraphRelationAppearanceTokenOverrides;
    /** 追加在默认 Relation rules 后的有序规则 */
    rules?: ReadonlyArray<IRGraphRelationThemeRule>;
  }>;
}>;

/** 为一个 Core Theme style 解析 Graph-owned 稀疏覆盖的运行时定义 */
export type GraphThemeStyleDefinition = Readonly<{
  /** 与 Core Theme style 对齐的开放名称 */
  name: string;
  /** 从当前位置完整 Core Theme 解析 Graph style 稀疏覆盖 */
  resolve: (theme: ResolvedTheme) => GraphThemeStyleOverrides;
}>;
