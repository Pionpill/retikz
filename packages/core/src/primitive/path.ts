/** 路径原语：SVG path d 字符串；Canvas/PDF renderer 自行解析 */
export type PathPrim = {
  /** 类型判别符 */
  type: 'path';
  /** SVG path d 字符串 */
  d: string;
  /** 填充色；不填表示不填充 */
  fill?: string;
  /** 描边色 */
  stroke?: string;
  /** 描边宽度 */
  strokeWidth?: number;
  /** SVG stroke-dasharray 模式 */
  strokeDasharray?: string;
  /** 端点形状 */
  strokeLinecap?: 'butt' | 'round' | 'square';
  /** 拐点形状 */
  strokeLinejoin?: 'miter' | 'round' | 'bevel';
  /** 整体透明度 0~1 */
  opacity?: number;
};
