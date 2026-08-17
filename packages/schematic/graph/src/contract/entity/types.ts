import type { IRNode, ResolvedTheme } from '@retikz/core';

import type { IRGraphEntityAppearanceTokenOverrides } from '../../schemas';

/** Entity role 的语义几何默认定义 */
export type EntityRoleDefinition = Readonly<{
  /** 开放的 Entity role key */
  role: string;
  /** 缺省 Core Node shape 与可选参数 */
  shape: NonNullable<IRNode['shape']>;
  /** 缺省 Core Node padding */
  padding: NonNullable<IRNode['padding']>;
  /** 可选缺省 Core Node minimum size */
  minimumSize?: NonNullable<IRNode['minimumSize']>;
}>;

/** Entity variant recipe 可见的确定解析上下文 */
export type EntityVariantResolveContext = Readonly<{
  /** 当前 Entity 位置完整、只读的 Core Theme */
  theme: ResolvedTheme;
  /** 已按 Graph 级联确定并物化的 Entity 主色 */
  color: string;
}>;

/** Entity variant 的稀疏外观 recipe 定义 */
export type EntityVariantDefinition = Readonly<{
  /** 开放的 Entity variant key */
  variant: string;
  /** 根据当前 Theme 与最终主色解析稀疏外观 token */
  resolve: (context: EntityVariantResolveContext) => IRGraphEntityAppearanceTokenOverrides;
}>;
