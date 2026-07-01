/**
 * 内置 pattern motif 名常量（用 const + ValueOf 派生，不用 TS enum）
 * @description 内置 3 motif：`lines`（横向阴影线）/ `dots`（波点）/ `grid`（横竖网格）。
 *   各 motif 的 tile 几何由 `BUILTIN_PATTERNS` 的 `PatternDefinition.emit` 在 compile 期产出。
 */
export const PatternShape = {
  Lines: 'lines',
  Dots: 'dots',
  Grid: 'grid',
} as const;

/** 图片填充到目标形状的适配方式 */
export const ImageFit = {
  /** 拉伸图片填满目标区域 */
  Fill: 'fill',
  /** 保持比例完整显示在目标区域内 */
  Contain: 'contain',
  /** 保持比例覆盖目标区域，允许裁切 */
  Cover: 'cover',
} as const;
