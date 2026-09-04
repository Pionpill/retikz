import type { GraphSurfaceThemeStyleTokens } from '../../contract';
import type { IRBlock } from '../../schemas';

/** Block resolve 后保留 sparse Source 并确定布局默认值的结构 */
export type CanonicalBlock = Readonly<{
  /** 作者输入的 sparse Block Source */
  source: IRBlock;
  /** Block 外层 Surface 的 effective 最小宽度 */
  minWidth: number;
  /** 当前 Core Theme 解析后的 Block 根 Surface appearance */
  shellAppearance: GraphSurfaceThemeStyleTokens;
}>;
