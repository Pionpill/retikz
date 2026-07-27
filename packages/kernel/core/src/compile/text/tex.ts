import type { PathCommand } from '../../contract';
import type { IRTexContent } from '../../schemas';

/** TeX 字形路径的绘制通道 */
export type LoweredTexPaint = { kind: 'none' } | { kind: 'currentColor' } | { kind: 'color'; value: string };

/** renderer-agnostic 的单条 TeX 绘制路径 */
export type LoweredTexPath = {
  /** 归一到 user units 的路径命令 */
  commands: Array<PathCommand>;
  /** 填充通道 */
  fill: LoweredTexPaint;
  /** 填充透明度 */
  fillOpacity?: number;
  /** 描边通道 */
  stroke: LoweredTexPaint;
  /** 描边宽度 */
  strokeWidth?: number;
  /** 描边透明度 */
  strokeOpacity?: number;
  /** 路径整体透明度 */
  opacity?: number;
  /** 填充规则 */
  fillRule?: 'nonzero' | 'evenodd';
};

/** renderer-agnostic 的 TeX 字形降解结果 */
export type LoweredTex = {
  /** 按绘制顺序排列的字形与装饰路径 */
  paths: Array<LoweredTexPath>;
  /** 公式布局宽度 */
  width: number;
  /** 公式从顶部到底部的总高度 */
  height: number;
  /** 公式基线以下的深度 */
  depth: number;
};

/** 把 TeX 内容按文字样式降解为字形轮廓；无法解析时返回 null */
export type LowerTex = (content: IRTexContent, style: { fontSize: number; color?: string }) => LoweredTex | null;
