import type { IRJsonObject } from '@retikz/core';
import type { infer as ZodInfer, ZodLiteral, ZodObject, ZodOptional, ZodString, ZodType } from 'zod';

import { JsonObjectSchema, JsonValueSchema } from '@retikz/core';
import { NonBlankStringSchema } from '@retikz/foundation';
import { PlotSchema } from '@retikz/plot';
import { array, literal, number, object, strictObject } from 'zod';

import { CHART_NAMESPACE } from '../constants';
import { ChartPlotExtensionSchema } from './plot-extension';
import { ChartPresentationSchema } from './presentation';
import { createChartThemeSchema } from './theme';

/** Chart 外部 layout 的正有限尺寸 */
export const ChartLayoutSchema = strictObject({
  width: number().positive().optional().describe('External Chart border-box width'),
  height: number().positive().optional().describe('External Chart border-box height'),
}).describe('External Chart layout dimensions; never copied into Plot Source IR');

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
  presentation: ChartPresentationSchema.optional(),
  theme: createChartThemeSchema(JsonObjectSchema).optional(),
  data: PlotSchema.shape.data.describe('Unique external dataset reference'),
  layout: ChartLayoutSchema.optional(),
  recipe: ChartRecipeShellSchema,
  plotExtension: ChartPlotExtensionSchema.optional(),
}).describe('Common strict Chart Source shell before a recipe-specific schema is selected');

/** 精确 recipe schema 组装所用的 root shape */
type ChartSourceShape<TFamily extends string, TRecipe extends ZodType, TTheme extends ZodType> = {
  namespace: ZodLiteral<typeof CHART_NAMESPACE>;
  type: ZodLiteral<TFamily>;
  id: ZodOptional<ZodString>;
  presentation: ZodOptional<typeof ChartPresentationSchema>;
  theme: TTheme;
  data: typeof PlotSchema.shape.data;
  layout: ZodOptional<typeof ChartLayoutSchema>;
  recipe: TRecipe;
  plotExtension: ZodOptional<typeof ChartPlotExtensionSchema>;
};

/** 按 family、recipe schema 与精确 recipe Theme schema 创建 strict Source schema */
export const createChartSourceSchema = <TFamily extends string, TRecipe extends ZodType, TTheme extends ZodType>(
  family: TFamily,
  recipe: TRecipe,
  theme: TTheme,
): ZodObject<ChartSourceShape<TFamily, TRecipe, TTheme>> =>
  strictObject({
    namespace: literal(CHART_NAMESPACE).describe('Chart namespace discriminator'),
    type: literal(family).describe('Stable Chart family discriminator'),
    id: NonBlankStringSchema.optional().describe('Optional Chart identity'),
    presentation: ChartPresentationSchema.optional(),
    theme,
    data: PlotSchema.shape.data.describe('Unique external dataset reference'),
    layout: ChartLayoutSchema.optional(),
    recipe,
    plotExtension: ChartPlotExtensionSchema.optional(),
  });

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
      properties?: IRJsonObject;
      /** 当前recipe允许的有序Chart marks */
      marks?: ReadonlyArray<IRJsonObject>;
      /** exact recipe可拥有的其它已验证字段 */
      [key: string]: unknown;
    }>;
  }>;
