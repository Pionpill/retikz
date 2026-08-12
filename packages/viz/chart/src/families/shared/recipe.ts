import type { IRJsonObject, JsonValue } from '@retikz/core';
import type { IRPlotSpec } from '@retikz/plot';
import type { ZodType } from 'zod';

import type { ChartInspectionMemberKindValue } from '../../inspection';
import type { IRChartShared } from '../../schemas/common';
import type { CHART_NAMESPACE } from '../../schemas/constants';

/** 所有私有 Chart variant 共用的 namespace 与判别边界 */
export type InternalChartSpecBound = IRChartShared & {
  /** Chart composite namespace */
  namespace: typeof CHART_NAMESPACE;
  /** 私有或公开 variant 判别值 */
  type: string;
};

/** recipe seed 中一个可追踪的语义 member */
export type ChartSeedMember = {
  /** 稳定语义 target */
  target: string;
  /** Plot member collection kind */
  kind: ChartInspectionMemberKindValue;
  /** 是否属于 recipe 必需结构 */
  core: boolean;
  /** seed 中的 JSON member 值 */
  value: IRJsonObject;
  /** 从 seed Plot 根精确定位该值的路径 */
  plotPath: ReadonlyArray<string | number>;
  /** 相对 member 根允许 patch 的非空叶路径 */
  patchablePaths: ReadonlyArray<ReadonlyArray<string>>;
  /** inspection 使用的 recipe source path */
  sourcePath: string;
};

/** 一个 member-relative patch change */
export type ChartPatchChange = {
  /** 相对 member 根的非空字段路径 */
  path: ReadonlyArray<string>;
  /** replace 或 upsert 的 JSON 值 */
  value: JsonValue;
};

/** 按 semantic target 分组的 Chart patch */
export type ChartMemberPatch = {
  /** 目标 recipe member */
  target: string;
  /** Chart 输入中的结构化诊断路径 */
  inputPath: ReadonlyArray<string | number>;
  /** inspection 使用的稳定输入 source path */
  sourcePath: string;
  /** 应用于同一 member 的字段 changes */
  changes: ReadonlyArray<ChartPatchChange>;
};

/** recipe 提供给通用 resolver 的 immutable pre-merge seed */
export type ChartRecipeSeed = {
  /** 完整的 recipe-owned PlotSpec seed */
  plot: IRPlotSpec;
  /** seed 中由 recipe 拥有的 member 索引 */
  members: ReadonlyArray<ChartSeedMember>;
  /** 尚未应用的 type-specific patches */
  patches: ReadonlyArray<ChartMemberPatch>;
};

/** recipe 可读取的表现性 topology defaults */
export type ChartRecipeStyleContext = {
  /** 是否默认生成 axis guides */
  axisEnabled: boolean;
  /** 是否默认启用 axis grid */
  axisGridEnabled: boolean;
  /** 是否允许 recipe 为可图例化 channel 生成 legend */
  legendEnabled: boolean;
  /** 最终 Plot series palette 的第一项 */
  seriesColor: string;
};

/** 保留具体 variant 类型的 Chart recipe */
export type ChartRecipe<TSpec extends InternalChartSpecBound> = {
  /** 与 schema literal 一致的 variant type */
  type: TSpec['type'];
  /** variant 的精确输入 schema */
  schema: ZodType<TSpec>;
  /** 从已解析 variant 建立 pre-merge seed */
  createSeed: (spec: TSpec, style: ChartRecipeStyleContext) => ChartRecipeSeed;
  /** merge 后验证 recipe 必需结构 */
  validateCore: (spec: TSpec, plotSpec: IRPlotSpec) => void;
};

/** 一次 schema bind 后恢复精确 variant 的闭包集合 */
export type BoundChartRecipe = {
  /** 已解析的公共 Chart bound */
  spec: InternalChartSpecBound;
  /** 生成绑定 variant 的 seed */
  createSeed: (style: ChartRecipeStyleContext) => ChartRecipeSeed;
  /** 验证绑定 variant 的最终 PlotSpec */
  validateCore: (plotSpec: IRPlotSpec) => void;
};

/** 冻结异构 tuple 中统一 lookup 的 recipe 表面 */
export type AnyChartRecipe = {
  /** recipe 判别值 */
  type: string;
  /** 解析一次输入并返回 variant-safe 闭包 */
  bind: (input: unknown) => BoundChartRecipe;
};
