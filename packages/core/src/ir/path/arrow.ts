import { z } from 'zod';
import type { ValueOf } from '../../types';

/**
 * 箭头形状常量（用 const 而非 TS enum 避免 reverse-mapping 和字面量不互通）
 * @description normal 实心三角（默认）；open 空心三角（UML 泛化/继承）；stealth 尖锐倒钩；diamond 实心菱形（UML 组合）；openDiamond 空心菱形（聚合）；circle 实心圆点；openCircle 空心圆点
 */
export const ARROW_SHAPES = {
  normal: 'normal',
  open: 'open',
  stealth: 'stealth',
  diamond: 'diamond',
  openDiamond: 'openDiamond',
  circle: 'circle',
  openCircle: 'openCircle',
} as const;

/** 箭头形状字面量类型 */
export type ArrowShape = ValueOf<typeof ARROW_SHAPES>;

/**
 * 空心 shape 集合（fill 字段在这些 shape 上 silent no-op）
 * @description compile 与 render 都引用此表判定 fill 是否丢弃；空心 shape 用 color 主导描边、lineWidth 控描边粗
 */
export const HOLLOW_ARROW_SHAPES = new Set<ArrowShape>(['open', 'openDiamond', 'openCircle']);

/** marker 默认尺寸（length / width 的 fallback；arrowMarkers viewBox 内的几何也按 10 单位定义） */
export const ARROW_MARKER_DEFAULT_SIZE = 6;

/** 空心 shape 描边默认粗细（lineWidth fallback；refX / shrink 计算都用它做"back stroke 半宽"） */
export const ARROW_MARKER_HOLLOW_DEFAULT_LINE_WIDTH = 1.5;

/**
 * 端点级箭头视觉规格 schema
 * @description 顶层 8 字段全 optional；fill 在空心 shape 上 silent no-op（schema 不拒绝、compile/render 丢字段）；start/end 子对象用相同字段集（无 start/end 递归）
 */
export const ArrowEndDetailSchema = z
  .object({
    shape: z
      .nativeEnum(ARROW_SHAPES)
      .optional()
      .describe(
        'Arrow tip shape. Defaults to `normal` (filled triangle). Other values: `open` (hollow triangle), `stealth` (sharp barb), `diamond`, `openDiamond`, `circle`, `openCircle`.',
      ),
    scale: z
      .number()
      .positive()
      .optional()
      .describe(
        'Uniform tip scale factor; multiplies `length` and `width` (e.g. `length=10, scale=1.5` → effective 15). Defaults to 1.',
      ),
    length: z
      .number()
      .nonnegative()
      .optional()
      .describe(
        'Tip length in user units (the dimension along the path direction). Defaults to ~6 (matching the legacy hardcoded markerWidth).',
      ),
    width: z
      .number()
      .nonnegative()
      .optional()
      .describe(
        'Tip width in user units (perpendicular to the path). Defaults to ~6 (matching the legacy hardcoded markerHeight).',
      ),
    color: z
      .string()
      .optional()
      .describe(
        'Stroke color override. When omitted, the marker inherits the path stroke via `context-stroke`.',
      ),
    fill: z
      .string()
      .optional()
      .describe(
        'Fill color override (effective only on solid shapes). Hollow shapes (`open` / `openDiamond` / `openCircle`) silently ignore this field — `color` drives the stroke.',
      ),
    opacity: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe(
        'Arrow opacity 0..1, independent from the path opacity. When omitted, inherits the path opacity.',
      ),
    lineWidth: z
      .number()
      .nonnegative()
      .optional()
      .describe(
        'Stroke width for hollow shapes (user units). Defaults to 1.5. Solid shapes ignore this field.',
      ),
  })
  .describe(
    'Per-end arrow visual spec: shape + visual fields (scale / length / width / color / fill / opacity / lineWidth). All optional; omitted fields fall through to top-level `arrowDetail` defaults and then built-in defaults.',
  );

/**
 * Path 级箭头详细配置 schema
 * @description 顶层视觉字段（与 `ArrowEndDetailSchema` 同字段集）作为起末共享默认；`start` / `end` 子对象逐字段 merge 顶层（缺省字段继承，已填字段 override）
 */
export const ArrowDetailSchema = ArrowEndDetailSchema.extend({
  start: ArrowEndDetailSchema.optional().describe(
    'Start-end override (effective only when `arrow` includes a start arrow: `<-` / `<->`). Fields merge into the top-level defaults; omitted fields inherit, present fields override.',
  ),
  end: ArrowEndDetailSchema.optional().describe(
    'End-end override (effective only when `arrow` includes an end arrow: `->` / `<->`). Fields merge into the top-level defaults; omitted fields inherit, present fields override.',
  ),
}).describe(
  'Path-level arrow detail. Top-level visual fields (shape / scale / length / width / color / fill / opacity / lineWidth) act as shared defaults for both ends; `start` / `end` sub-objects per-field override the defaults.',
);

/** 端点级箭头视觉规格 */
export type IRArrowEndDetail = z.infer<typeof ArrowEndDetailSchema>;
/** Path 级箭头详细配置 */
export type IRArrowDetail = z.infer<typeof ArrowDetailSchema>;
