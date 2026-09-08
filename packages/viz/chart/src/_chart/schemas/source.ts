import type { JsonObject } from '@retikz/foundation';
import type { infer as ZodInfer, ZodLiteral, ZodObject, ZodOptional, ZodString, ZodType } from 'zod';

import { JsonObjectSchema, JsonValueSchema, NonBlankStringSchema } from '@retikz/foundation';
import { LayoutContainerBoxSchema, LayoutGapSchema } from '@retikz/layout';
import { PlotSchema } from '@retikz/plot';
import { SurfaceBackgroundSchema } from '@retikz/standard';
import { array, literal, number, object, strictObject } from 'zod';

import { CHART_NAMESPACE } from '../constants';
import { ChartPlotExtensionSchema } from './plot-extension';
import { ChartPresentationSchema } from './presentation';
import { ChartDefaultsSchema } from './theme';

const ChartPaddingSchema = LayoutContainerBoxSchema.shape.padding.unwrap();

/** Chart 外部 layout 的正有限尺寸 */
export const ChartLayoutSchema = strictObject({
  width: number().positive().optional().describe('External Chart border-box width'),
  height: number().positive().optional().describe('External Chart border-box height'),
  padding: ChartPaddingSchema.optional().describe(
    'Chart shell padding around existing presentation regions and Plot content',
  ),
  gap: LayoutGapSchema.optional().describe('Gap between existing Chart presentation regions and Plot content'),
}).describe('Chart shell layout; width and height never enter Plot Source IR');

/** 内部 erased recipe shell schema；仅用于推导通用 Source 类型 */
const ChartRecipeShellSchema = object({
  chartType: NonBlankStringSchema.describe('Globally unique recipe key'),
  encodings: JsonObjectSchema.describe('Recipe-owned field-bound encoding roles'),
  properties: JsonObjectSchema.optional().describe('Recipe-owned constant properties'),
  marks: array(object({ kind: NonBlankStringSchema.describe('Registered Chart mark kind') }).catchall(JsonValueSchema))
    .optional()
    .describe('Ordered Chart marks'),
}).catchall(JsonValueSchema);

/** 内部 erased Source shell schema；不参与最终 Source parse */
const ChartSourceShellSchema = strictObject({
  namespace: literal(CHART_NAMESPACE).describe('Chart namespace discriminator'),
  type: NonBlankStringSchema.describe('Registered Chart family discriminator'),
  id: NonBlankStringSchema.optional().describe('Optional Chart identity'),
  background: SurfaceBackgroundSchema.optional().describe('Chart surface background'),
  presentation: ChartPresentationSchema.optional(),
  chartDefaults: ChartDefaultsSchema.optional(),
  data: PlotSchema.shape.data.describe('Unique external dataset reference'),
  layout: ChartLayoutSchema.optional(),
  coordinate: PlotSchema.shape.coordinate,
  recipe: ChartRecipeShellSchema,
  plotExtension: ChartPlotExtensionSchema.optional(),
}).describe('Common strict Chart Source shell before a recipe-specific schema is selected');

/** 精确 recipe schema 组装所用的 root shape */
type ChartSourceShape<TFamily extends string, TRecipe extends ZodType> = {
  namespace: ZodLiteral<typeof CHART_NAMESPACE>;
  type: ZodLiteral<TFamily>;
  id: ZodOptional<ZodString>;
  background: ZodOptional<typeof SurfaceBackgroundSchema>;
  presentation: ZodOptional<typeof ChartPresentationSchema>;
  chartDefaults: ZodOptional<typeof ChartDefaultsSchema>;
  data: typeof PlotSchema.shape.data;
  layout: ZodOptional<typeof ChartLayoutSchema>;
  coordinate: typeof PlotSchema.shape.coordinate;
  recipe: TRecipe;
  plotExtension: ZodOptional<typeof ChartPlotExtensionSchema>;
};

/** 按 family 与精确 recipe schema 创建 strict Source schema */
export const createChartSourceSchema = <TFamily extends string, TRecipe extends ZodType>(
  family: TFamily,
  recipe: TRecipe,
): ZodObject<ChartSourceShape<TFamily, TRecipe>> => {
  return strictObject({
    namespace: literal(CHART_NAMESPACE).describe('Chart namespace discriminator'),
    type: literal(family).describe('Stable Chart family discriminator'),
    id: NonBlankStringSchema.optional().describe('Optional Chart identity'),
    background: SurfaceBackgroundSchema.optional().describe('Chart surface background'),
    presentation: ChartPresentationSchema.optional(),
    chartDefaults: ChartDefaultsSchema.optional(),
    data: PlotSchema.shape.data.describe('Unique external dataset reference'),
    layout: ChartLayoutSchema.optional(),
    coordinate: PlotSchema.shape.coordinate,
    recipe,
    plotExtension: ChartPlotExtensionSchema.optional(),
  }).superRefine((source, context) => {
    if (source.coordinate !== undefined && source.plotExtension?.composition !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['plotExtension', 'composition'],
        message: 'Chart Source cannot contain both root coordinate and Plot composition extension',
      });
    }
  });
};

type IRChartSourceShell = ZodInfer<typeof ChartSourceShellSchema>;

/**
 * Chart Source 的通用typed shell形态
 * @description exact recipe schema仍是运行时真源；erased shell只把开放owner operation保留为unknown字段，避免伪造闭合通用encoding union
 */
export type IRChartSource = Omit<IRChartSourceShell, 'recipe'> &
  Readonly<{
    recipe: Readonly<{
      /** 当前exact recipe Definition的全局key */
      chartType: string;
      /** 由exact chartType schema验证的开放owner operation与字段mapping */
      encodings: Readonly<Record<string, unknown>>;
      /** 当前recipe的constant property slots */
      properties?: JsonObject;
      /** 当前recipe允许的有序Chart marks */
      marks?: ReadonlyArray<JsonObject>;
      /** exact recipe可拥有的其它已验证字段 */
      [key: string]: unknown;
    }>;
  }>;
