import { JsonObjectSchema, JsonValueSchema } from '@retikz/core';
import { PlotSchema } from '@retikz/plot';
import { z } from 'zod';

import { CHART_NAMESPACE } from '../constants';
import { ChartPlotExtensionSchema } from './plot-extension';
import { ChartPresentationSchema } from './presentation';
import { createChartThemeSchema } from './theme';

/** Chart 外部 layout 的正有限尺寸 */
export const ChartLayoutSchema = z
  .strictObject({
    width: z.number().positive().optional().describe('External Chart border-box width'),
    height: z.number().positive().optional().describe('External Chart border-box height'),
  })
  .describe('External Chart layout dimensions; never copied into Plot Source IR');

/** 内部 erased recipe shell schema；仅用于推导通用 Source 类型 */
const ChartRecipeShellSchema = z
  .object({
    chartType: z.string().min(1).describe('Globally unique recipe key'),
    encodings: JsonObjectSchema.describe('Recipe-owned field-bound encoding roles'),
    properties: JsonObjectSchema.optional().describe('Recipe-owned constant properties'),
    marks: z
      .array(z.object({ kind: z.string().min(1).describe('Registered Chart mark kind') }).catchall(JsonValueSchema))
      .optional()
      .describe('Ordered Chart marks'),
  })
  .catchall(JsonValueSchema);

/** 内部 erased Source shell schema；不参与最终 Source parse */
const ChartSourceShellSchema = z
  .strictObject({
    namespace: z.literal(CHART_NAMESPACE).describe('Chart namespace discriminator'),
    type: z.string().min(1).describe('Registered Chart family discriminator'),
    id: z.string().min(1).optional().describe('Optional Chart identity'),
    presentation: ChartPresentationSchema.optional(),
    theme: createChartThemeSchema(JsonObjectSchema).optional(),
    data: PlotSchema.shape.data.describe('Unique external dataset reference'),
    layout: ChartLayoutSchema.optional(),
    recipe: ChartRecipeShellSchema,
    plotExtension: ChartPlotExtensionSchema.optional(),
  })
  .describe('Common strict Chart Source shell before a recipe-specific schema is selected');

/** 精确 recipe schema 组装所用的 root shape */
type ChartSourceShape<TFamily extends string, TRecipe extends z.ZodTypeAny, TTheme extends z.ZodTypeAny> = {
  namespace: z.ZodLiteral<typeof CHART_NAMESPACE>;
  type: z.ZodLiteral<TFamily>;
  id: z.ZodOptional<z.ZodString>;
  presentation: z.ZodOptional<typeof ChartPresentationSchema>;
  theme: TTheme;
  data: typeof PlotSchema.shape.data;
  layout: z.ZodOptional<typeof ChartLayoutSchema>;
  recipe: TRecipe;
  plotExtension: z.ZodOptional<typeof ChartPlotExtensionSchema>;
};

/** 按 family、recipe schema 与精确 recipe Theme schema 创建 strict Source schema */
export const createChartSourceSchema = <
  TFamily extends string,
  TRecipe extends z.ZodTypeAny,
  TTheme extends z.ZodTypeAny,
>(
  family: TFamily,
  recipe: TRecipe,
  theme: TTheme,
): z.ZodObject<ChartSourceShape<TFamily, TRecipe, TTheme>> =>
  z.strictObject({
    namespace: z.literal(CHART_NAMESPACE).describe('Chart namespace discriminator'),
    type: z.literal(family).describe('Stable Chart family discriminator'),
    id: z.string().min(1).optional().describe('Optional Chart identity'),
    presentation: ChartPresentationSchema.optional(),
    theme,
    data: PlotSchema.shape.data.describe('Unique external dataset reference'),
    layout: ChartLayoutSchema.optional(),
    recipe,
    plotExtension: ChartPlotExtensionSchema.optional(),
  });

/** Chart Source 的通用 typed shell 形态 */
export type IRChartSource = z.infer<typeof ChartSourceShellSchema>;
