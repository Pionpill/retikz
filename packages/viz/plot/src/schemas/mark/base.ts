import { DataTransformDeclarationSchema } from '@retikz/data';
import type { ValueOf } from '@retikz/foundation';
import { NonBlankStringSchema } from '@retikz/foundation';
import { array, boolean, number } from 'zod';
import type { infer as ZodInfer } from 'zod';

import { PlotLayerSchema } from '../plot/layer';

/**
 * mark 类型关键字（暴露给用户；成员值即 IR 判别串，裸字面量 `'point'` 同样可用）
 * @description discriminated union 判别字段，成员里写 z.literal(BuiltinPlotMark.x)（不用 z.enum）。
 *   3 个抽象 mark（point / path / interval，描述数据在坐标空间的 k 维几何）
 */
export const BuiltinPlotMark = {
  /** 维度 mark / 0D：坐标元组上的实体 / glyph / 文本 anchor（散点 + 文本标签） */
  Point: 'point',
  /** 维度 mark / 1D：有序点连成的一维轨迹（折线 / 闭合轮廓） */
  Path: 'path',
  /** 维度 mark / 区间积：各位置 role 正交区间积，经坐标系投影成段 / 矩形 / 扇区 / cell（柱 / histogram / heatmap / 径向柱 / 饼环） */
  Interval: 'interval',
} as const;

/** 视觉值来自字段、常量或其它显式映射的判别方式 */
export const MarkValueKind = {
  /** 从数据字段解析视觉值 */
  Field: 'field',
  /** 直接使用常量视觉值 */
  Constant: 'constant',
} as const;

/** mark 类型 */
export type BuiltinPlotMark = ValueOf<typeof BuiltinPlotMark>;

/** mark 值来源变体 */
export type MarkValueKind = ValueOf<typeof MarkValueKind>;

/** 校验根变换之后执行、仅供当前标记消费的数据变换序列 */
export const MarkTransformSchema = array(DataTransformDeclarationSchema).describe(
  'Mark-local transform pipeline applied after the plot root transform to derive rows consumed only by this mark',
);

/** 各图元共享的身份、坐标视图与局部变换字段 */
export const markBase = {
  contributeToDomain: boolean()
    .default(true)
    .optional()
    .describe('Include data-space positions in inferred domains; edges never contribute'),
  id: NonBlankStringSchema.optional().describe('Optional mark handle used by generated scope and anchor targets'),
  defaultColorGroup: NonBlankStringSchema.optional().describe(
    'Optional semantic group whose marks share one sequential palette.series slot when no explicit color is authored',
  ),
  defaultColorIndex: number()
    .int()
    .nonnegative()
    .optional()
    .describe('Explicit fallback index in palette.series; authored paints and field encodings take precedence'),
  layer: PlotLayerSchema.optional().describe(
    'Semantic plot layer override applied to the outer mark scope; mark datum zIndex remains a separate style channel',
  ),
  coordinateView: NonBlankStringSchema.optional().describe(
    'Coordinate view id this mark is projected through; omit to use the plot composition default view',
  ),
  transforms: MarkTransformSchema.optional().describe(
    'Optional mark-local transform pipeline applied after the plot root transform',
  ),
};

/** mark 局部数据变换声明 */
export type IRPlotMarkTransform = ZodInfer<typeof MarkTransformSchema>;
