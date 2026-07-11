import type { PathCommand } from '../../contract';
import type { IRTexContent } from '../../schemas';

/** renderer-agnostic 的 TeX 字形降解结果。 */
export type LoweredTex = {
  /** 归一到 user units 的字形轮廓命令。 */
  commands: Array<PathCommand>;
  /** 公式布局宽度。 */
  width: number;
  /** 公式从顶部到底部的总高度。 */
  height: number;
  /** 公式基线以下的深度。 */
  depth: number;
};

/** 把 TeX 内容按文字样式降解为字形轮廓；无法解析时返回 null。 */
export type LowerTex = (content: IRTexContent, style: { fontSize: number; color?: string }) => LoweredTex | null;
