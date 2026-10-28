import type { ValueOf, OpenString } from '@retikz/foundation';
import { createOpenStringSchema, NormalizedFractionSchema } from '@retikz/foundation';
import { strictObject } from 'zod';
import type { infer as ZodInfer } from 'zod';

import { MarkStyleSchema } from './mark';

/** 内置箭头形状名称 */
export const BuiltinArrowShape = {
  Normal: 'normal',
  Open: 'open',
  Stealth: 'stealth',
  OpenStealth: 'openStealth',
  Circle: 'circle',
  OpenCircle: 'openCircle',
} as const;

export type BuiltinArrowShape = ValueOf<typeof BuiltinArrowShape>;

/** 箭头默认形状 */
export const DEFAULT_ARROW_SHAPE = BuiltinArrowShape.Stealth;

/** 箭头默认尺寸（length / width 的 fallback） */
export const ARROW_MARKER_DEFAULT_SIZE = 8;

/** 空心 shape 描边默认粗细（lineWidth fallback） */
export const ARROW_MARKER_HOLLOW_DEFAULT_LINE_WIDTH = 1.5;

/** Core 内置 arrow 与自定义注册名共享的开放名称 schema */
export const ArrowShapeSchema = createOpenStringSchema(BuiltinArrowShape).describe(
  'Arrow shape provider name: a Core built-in or a custom name registered via CompileOptions.arrows.',
);

/** 校验箭头的形状、尺寸与视觉样式 */
export const ArrowStyleSchema = MarkStyleSchema.extend({
  shape: ArrowShapeSchema.optional(),
});

/** 校验端点箭头的外观与接触重叠 */
export const PathArrowEndSchema = ArrowStyleSchema.extend({
  endpointOverlap: NormalizedFractionSchema.optional().describe('Endpoint contact overlap ratio. Defaults to zero.'),
});

export type IRPathArrowEnd = ZodInfer<typeof PathArrowEndSchema>;

/** 校验路径起点与终点的箭头声明 */
export const PathArrowSchema = strictObject({
  start: PathArrowEndSchema.optional().describe('Arrow at the start of the path.'),
  end: PathArrowEndSchema.optional().describe('Arrow at the end of the path.'),
});

export type IRPathArrow = ZodInfer<typeof PathArrowSchema>;

/** 校验两端箭头共用的视觉字段及逐端覆盖 */
export const ArrowDetailSchema = ArrowStyleSchema.extend({
  start: PathArrowEndSchema.optional().describe(
    'Per-start arrow override. Present fields override top-level arrowDetail defaults.',
  ),
  end: PathArrowEndSchema.optional().describe(
    'Per-end arrow override. Present fields override top-level arrowDetail defaults.',
  ),
})
  .strict()
  .describe(
    'Path-level arrow detail. Top-level fields are shared defaults for both ends; `start` / `end` override them per field.',
  );

/** 箭头形状、尺寸与视觉样式 */
export type IRArrowStyle = ZodInfer<typeof ArrowStyleSchema>;

/** Path 级箭头详细配置 */
export type IRArrowDetail = ZodInfer<typeof ArrowDetailSchema>;

/** 箭头形状名称，支持内置名称和已注册的自定义名称 */
export type ArrowShape = OpenString<BuiltinArrowShape>;
