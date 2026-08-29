import type { IRJsonObject } from '@retikz/core';
import type { AnyRowSelectorDefinition, AnyStatisticsReducerDefinition, AnyTransformDefinition } from '@retikz/data';
import type { NonEmptyReadonlyArray, ValueOf } from '@retikz/foundation';
import type {
  AnyScaleDefinition,
  IRPlot,
  IRPlotCoordinateOperation,
  IRPlotFacetOptions,
  IRPlotGuide,
  IRPlotMarkOperation,
  IRPlotPartitionDimension,
  IRPlotScaleOperation,
  IRPlotTransform,
} from '@retikz/plot';
import type { ZodType } from 'zod';

import type { IRChartSource } from '../schemas';
import type { ChartMarkBinding } from './mark';

/** encoding resolve使用的owner Definition注册表 */
export type ChartEncodingRuntime = Readonly<{
  /** Data / Plot transform Definition注册表 */
  transforms: ReadonlyMap<string, AnyTransformDefinition>;
  /** Data statistics reducer Definition注册表 */
  reducers: ReadonlyMap<string, AnyStatisticsReducerDefinition>;
  /** Data row selector Definition注册表 */
  selectors: ReadonlyMap<string, AnyRowSelectorDefinition>;
  /** Plot scale Definition注册表 */
  scales: ReadonlyMap<string, AnyScaleDefinition>;
}>;

/** rich mapping解析后的直接字段绑定 */
export type ChartResolvedFieldMapping = Readonly<{
  /** 最终consumer读取的字段 */
  field: string;
  /** 非位置consumer使用的可选named scale */
  scale?: string;
}>;

/** encoding驱动的Chart composition类别 */
export const ChartEncodingSpatialKind = {
  Facet: 'facet',
} as const;

/** encoding驱动的Chart composition类别取值 */
export type ChartEncodingSpatialKindValue = ValueOf<typeof ChartEncodingSpatialKind>;

/** encoding驱动的Chart composition消费态 */
export type ChartEncodingSpatialResolution = Readonly<{
  kind: typeof ChartEncodingSpatialKind.Facet;
  id: string;
  view: string;
  row?: IRPlotPartitionDimension | Array<IRPlotPartitionDimension>;
  column?: IRPlotPartitionDimension | Array<IRPlotPartitionDimension>;
  options: IRPlotFacetOptions;
}>;

/** exact encoding mapping计划的确定解析结果 */
export type ChartEncodingResolution = Readonly<{
  /** semantic与authored Chart mark消费的direct field投影 */
  encodings: IRJsonObject;
  /** 按闭合phase与ordered slots排列的派生operation */
  transform: ReadonlyArray<IRPlotTransform>;
  /** encoding唯一声明的named scale operation */
  scales: ReadonlyArray<IRPlotScaleOperation>;
  /** position role到最终named scale的连接 */
  positionScales: Readonly<Record<string, string>>;
  /** 被encoding operation替换且无其它consumer的recipe fallback */
  removedRecipeScales: ReadonlySet<string>;
  /** 可选的facet消费态 */
  spatial?: ChartEncodingSpatialResolution;
}>;

/** 一个recipe解析exact encoding mapping所需的窄上下文 */
export type ChartEncodingResolveContext<TSource extends IRChartSource = IRChartSource> = Readonly<{
  /** 当前exact schema已经parse的Chart Source */
  source: TSource;
  /** 当前recipe经过exact schema校验的mapping对象 */
  encodings: TSource['recipe']['encodings'];
  /** 与Plot lowering一致的owner Definition注册表 */
  runtime: ChartEncodingRuntime;
}>;

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
export type ChartSlotConsumption<TEncodingSlot extends string = string> = Readonly<{
  /** 被消费的 encoding slot 名称 */
  encodings: ReadonlyArray<TEncodingSlot>;
  /** 被消费的 property slot 名称 */
  properties: ReadonlyArray<string>;
}>;

type ChartEncodingSlot<TSource extends IRChartSource> = Extract<keyof TSource['recipe']['encodings'], string>;

/** 一个 chartType 的精确 recipe Definition */
export type ChartRecipeDefinition<TSource extends IRChartSource = IRChartSource> = Readonly<{
  /** 全局唯一的 recipe 判别值 */
  chartType: string;
  /** exact schema、调度、消费检查与mark继承共用的唯一encoding顺序 */
  encodingSlots: ReadonlyArray<ChartEncodingSlot<TSource>>;
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
  /** 内建 recipe resolver 消费的根级slots；encoding成员必须来自encodingSlots */
  consumes: ChartSlotConsumption<ChartEncodingSlot<TSource>>;
  /** 当前 recipe 按顺序允许使用的 authored Chart marks */
  marks: ReadonlyArray<ChartMarkBinding>;
  /** 把当前chartType的exact mapping解析为direct consumer与Plot operation */
  resolveEncodings: (context: ChartEncodingResolveContext<TSource>) => ChartEncodingResolution;
  /** 将当前 recipe 意图解析为 Plot scaffold 与内建语义 mark */
  resolve: (context: ChartRecipeResolveContext) => ChartRecipeResolution;
}>;

/** 异构 registry 保存的 Chart recipe Definition */
export type AnyChartRecipeDefinition = ChartRecipeDefinition<IRChartSource>;

/** 定义一个 Chart recipe；内置与自定义使用同一 identity-preserving contract */
export const defineChartRecipe = <TSource extends IRChartSource>(
  definition: ChartRecipeDefinition<TSource>,
): ChartRecipeDefinition<TSource> => definition;

/** 在异构 registry 边界擦除 recipe 的精确 Source 泛型 */
export const eraseChartRecipeDefinition = <TSource extends IRChartSource>(
  definition: ChartRecipeDefinition<TSource>,
): AnyChartRecipeDefinition => definition as unknown as AnyChartRecipeDefinition;
