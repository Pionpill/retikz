import type { IRJsonObject } from '@retikz/core';
import type { NonEmptyReadonlyArray } from '@retikz/foundation';
import type { IRPlotMarkOperation } from '@retikz/plot';
import type { ZodType } from 'zod';

/** Chart mark resolver 的窄 typed context */
export type ChartMarkResolveContext = Readonly<{
  /** 当前 mark 所属 recipe 的全局唯一 chartType */
  chartType: string;
  /** 当前正在解析的 authored Chart mark Source IR，不是完整 Chart Source IR */
  source: IRJsonObject;
  /** recipe binding 允许当前 mark 从根级 recipe 继承的 slots */
  inherited: Readonly<{
    /** 从根级 recipe encodings 选取的字段绑定 */
    encodings: IRJsonObject;
    /** 从根级 recipe properties 选取的常量配置 */
    properties: IRJsonObject;
  }>;
  /** 当前 recipe 已解析完成的主题 token */
  recipeThemeTokens: IRJsonObject;
}>;

/** Chart mark 的确定输出 */
export type ChartMarkResolution = Readonly<{
  /** 当前 Chart mark 解析得到的非空 Plot mark 序列 */
  marks: NonEmptyReadonlyArray<IRPlotMarkOperation>;
}>;

/** 一个可被 recipe 白名单消费的 Chart mark Definition */
export type ChartMarkDefinition = Readonly<{
  /** Chart mark payload 的唯一判别值 */
  kind: string;
  /** 当前 kind 对应的精确 Source IR schema */
  schema: ZodType<IRJsonObject>;
  /** 将当前 Chart mark 与可继承上下文解析为 Plot mark */
  resolve: (context: ChartMarkResolveContext) => ChartMarkResolution;
}>;

/** recipe 对 Chart mark 的有序允许关系与继承槽声明 */
export type ChartMarkBinding = Readonly<{
  /** 当前 recipe 允许使用的 Chart mark Definition */
  definition: ChartMarkDefinition;
  /** 当前 mark 可以从根级 recipe 继承的 slot 名称 */
  inherit: Readonly<{
    /** 允许继承的 recipe encoding slot 名称 */
    encodings?: ReadonlyArray<string>;
    /** 允许继承的 recipe property slot 名称 */
    properties?: ReadonlyArray<string>;
  }>;
}>;

/** 定义一个 Chart mark */
export const defineChartMark = (definition: ChartMarkDefinition): ChartMarkDefinition => definition;
