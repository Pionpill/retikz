/**
 * scope.id synthetic 包络形状（受控枚举）
 * @description 'rectangle'（轴对齐外接矩形 AABB，默认）/ 'circle'（最小外接圆 Welzl）。
 *   与 Node `shape` / `boundary` 的开放 shape 系统不同：把任意子树点集包进某形状需要逐形状的
 *   "最小外接 X" 算法，无法走 ShapeRegistry 借用任意已注册 shape，故为闭集枚举而非开放 shape 引用
 */
export const ScopeBoundingShape = {
  /** 轴对齐外接矩形（默认） */
  Rectangle: 'rectangle',
  /** 最小外接圆 */
  Circle: 'circle',
} as const;

/** scope 样式继承重置通道 */
export const ScopeStyleChannel = {
  /** node 默认样式通道 */
  Node: 'node',
  /** path 默认样式通道 */
  Path: 'path',
  /** label 默认样式通道 */
  Label: 'label',
  /** arrow 默认样式通道 */
  Arrow: 'arrow',
} as const;
