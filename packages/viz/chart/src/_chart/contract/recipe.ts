import type { IRJsonObject } from '@retikz/core';
import type { NonEmptyReadonlyArray } from '@retikz/foundation';
import type {
  IRPlot,
  IRPlotCoordinateOperation,
  IRPlotGuide,
  IRPlotMarkOperation,
  IRPlotScaleOperation,
  IRPlotTransform,
} from '@retikz/plot';
import type { ZodType } from 'zod';

import type { IRChartSource } from '../schemas';
import type { ChartMarkBinding } from './mark';

/** Recipe schema 解析后的语义 scaffold */
export type ChartRecipeScaffold = Readonly<{
  /** Recipe 生成并传入 Plot 的数据变换序列 */
  transform?: ReadonlyArray<IRPlotTransform>;
  /** Recipe 生成的 Plot scale 及其可覆盖策略 */
  scales: ReadonlyArray<
    Readonly<{
      /** Plot scale operation */
      value: IRPlotScaleOperation;
      /** 是否允许 plotExtension 覆盖该 scale */
      replaceable: boolean;
    }>
  >;
  /** Recipe 生成的唯一 coordinate 或 composition 及其可覆盖策略 */
  spatial: Readonly<
    | Readonly<{
        /** Plot coordinate operation */
        coordinate: IRPlotCoordinateOperation;
        /** 是否允许 plotExtension 覆盖该 coordinate */
        replaceable: boolean;
      }>
    | Readonly<{
        /** Plot composition 配置 */
        composition: NonNullable<IRPlot['composition']>;
        /** 是否允许 plotExtension 覆盖该 composition */
        replaceable: boolean;
      }>
  >;
  /** Recipe 生成的 Plot guides 及其可覆盖策略 */
  guides?: Readonly<{
    /** Plot guide 序列 */
    value: ReadonlyArray<IRPlotGuide>;
    /** 是否允许 plotExtension 覆盖 guides */
    replaceable: boolean;
  }>;
}>;

/** Recipe semantic mark 与 scaffold 的确定解析结果 */
export type ChartSemanticMarkResolution = Readonly<{
  /** 当前内建语义 mark 对应的 Chart mark kind */
  kind: string;
  /** 当前语义 mark 原子生成的非空、有序 Plot mark 序列 */
  plotMarks: NonEmptyReadonlyArray<IRPlotMarkOperation>;
}>;

/** Recipe semantic mark groups 与 scaffold 的确定解析结果 */
export type ChartRecipeResolution = Readonly<{
  /** Recipe 生成的 Plot 公共结构 */
  scaffold: ChartRecipeScaffold;
  /** 当前 chartType 的内建语义 mark groups */
  semanticMarks: NonEmptyReadonlyArray<ChartSemanticMarkResolution>;
}>;

/** Recipe resolver 的窄 typed context */
export type ChartRecipeResolveContext = Readonly<{
  /** 可选的 Chart Source 身份 */
  id?: string;
  /** Chart Source 引用的 Plot 数据 */
  data: IRPlot['data'];
  /** 当前 recipe 经过精确 schema 校验的字段绑定 */
  encodings: IRJsonObject;
  /** 当前 recipe 经过精确 schema 校验的常量配置 */
  properties: IRJsonObject;
  /** 当前 recipe 已解析完成的主题 token */
  recipeThemeTokens: IRJsonObject;
}>;

/** Chart resolver 消费的根级 encoding / property slots */
export type ChartSlotConsumption = Readonly<{
  /** 被消费的 encoding slot 名称 */
  encodings: ReadonlyArray<string>;
  /** 被消费的 property slot 名称 */
  properties: ReadonlyArray<string>;
}>;

/** 一个 chartType 的精确 recipe Definition */
export type ChartRecipeDefinition<TSource extends IRChartSource = IRChartSource> = Readonly<{
  /** 全局唯一的 recipe 判别值 */
  chartType: string;
  /** 当前 chartType 对应的完整精确 Chart Source schema */
  schema: ZodType<TSource>;
  /** 当前 recipe 的主题校验与默认值契约 */
  theme: Readonly<{
    /** 当前 recipe 允许声明的稀疏主题 token schema */
    overridesSchema: ZodType<IRJsonObject>;
    /** 当前 recipe resolver 消费的完整主题 token schema */
    resolutionSchema: ZodType<IRJsonObject>;
    /** 当前 recipe 主题 token 的完整默认值 */
    fallback: IRJsonObject;
  }>;
  /** 内建 recipe resolver 消费的根级 slots */
  consumes: ChartSlotConsumption;
  /** 当前 recipe 按顺序允许使用的 authored Chart marks */
  marks: ReadonlyArray<ChartMarkBinding>;
  /** 将当前 recipe 意图解析为 Plot scaffold 与内建语义 mark */
  resolve: (context: ChartRecipeResolveContext) => ChartRecipeResolution;
}>;

/** 定义一个 Chart recipe；内置与自定义使用同一 identity-preserving contract */
export const defineChartRecipe = <TSource extends IRChartSource>(
  definition: ChartRecipeDefinition<TSource>,
): ChartRecipeDefinition<TSource> => definition;
