import { z } from 'zod';
import { CompositeBaseSchema, JsonObjectSchema, type ValueOf } from '@retikz/core';
import { CoordinateSchema } from './coordinate';
import { DataRefSchema } from './data';
import { MarkSchema } from './mark';
import { ScaleSchema } from './scale';

/** plot 域 namespace（单一固定值，作 Tier 2 路由键的单一真源） */
export const PLOT_NAMESPACE = 'plot';

/**
 * plot namespace 内的 composite 类型关键字（暴露给用户；成员值即 IR 判别串，裸 `'plot'` 同样可用）
 * @description discriminated union 判别字段，成员里写 z.literal(PlotComposite.x)（不用 nativeEnum）；后续加 axis / legend…
 */
export const PlotComposite = {
  /** 顶层 grammar-of-graphics spec 节点 */
  Plot: 'plot',
} as const;

/** plot composite 类型 */
export type PlotNodeType = ValueOf<typeof PlotComposite>;

export const PlotSpecSchema = CompositeBaseSchema.extend({
  namespace: z
    .literal(PLOT_NAMESPACE)
    .describe('Tier 2 domain namespace; routes this node to the plot lowering registered via CompileOptions.composites'),
  type: z
    .literal(PlotComposite.Plot)
    .describe('Composite type within the plot namespace: the top-level grammar-of-graphics spec node'),
  id: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Optional handle for the whole plot; reserved as the scope reference id / anchor target used by composition and interaction (resolution deferred to alpha.5). Zero-cost reservation: alpha.1 only validates the field, attaches no semantics.',
    ),
  data: DataRefSchema.describe(
    'Data binding: a named reference to an externally-supplied dataset plus an optional data model. The dataset values never enter the IR; they are injected at compile time via lowerPlots(datasets).',
  ),
  scales: z
    .array(ScaleSchema)
    .describe('Named scales; referenced by coordinate (and by non-positional channels in later versions)'),
  coordinate: CoordinateSchema.describe('The coordinate system; owns positional scale bindings (alpha.1: cartesian2D only)'),
  marks: z.array(MarkSchema).min(1).describe('Mark layers, drawn in array order (stable z-order)'),
  meta: JsonObjectSchema.optional().describe(
    'Free-form JSON-serializable source metadata passthrough; reserved so lowering can preserve provenance into core IR meta',
  ),
}).describe(
  'Plot IR root: a JSON-serializable, data-free grammar-of-graphics composite node (namespace "plot"); bound to external data and lowered to core Scope/Node/Path/Step/Coordinate at compile time via lowerPlots',
);

/** Plot IR 根节点（plot composite 节点） */
export type PlotSpec = z.infer<typeof PlotSpecSchema>;
