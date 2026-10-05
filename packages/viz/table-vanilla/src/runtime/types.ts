import type { IRScene } from '@retikz/core';
import type { ExternalDatasets, DataInputBindings, DataTransformExecutor } from '@retikz/data';
import type { IRTable, LowerTablesOptions, TableLayoutManifest } from '@retikz/table';
import type { RenderToStringOptions } from '@retikz/vanilla';

/** renderTable 共享选项 */
export type RenderTableCommonOptions = Pick<RenderToStringOptions, 'output' | 'compile' | 'animation'> & {
  /** renderTable 根级 Core Theme，与 React Layout 的 theme 语义相同 */
  theme?: IRScene['theme'];
  /** Table lowering 消费的外部 datasets */
  data?: ExternalDatasets;
  /** Table definitions 与其它 lowering 选项 */
  lowerOptions?: LowerTablesOptions;
};

/** renderTable 普通 SVG string 模式 */
export type RenderTableOptions = RenderTableCommonOptions & {
  /** 省略或 false 时只返回 SVG string */
  artifacts?: false;
};

/** renderTable artifact 模式 */
export type RenderTableArtifactOptions = RenderTableCommonOptions & {
  /** 返回 SVG 与 Table manifest sidecar */
  artifacts: true;
};

/** renderTable artifact 模式结果 */
export type RenderTableArtifactResult = Readonly<{
  /** SSR SVG 字符串 */
  svg: string;
  /** 与 SVG 同源的 Table layout manifest */
  manifest: TableLayoutManifest;
}>;

/** renderTable overload 合同 */
export type RenderTable = {
  (spec: IRTable, options: RenderTableArtifactOptions): RenderTableArtifactResult;
  (spec: IRTable, options?: RenderTableOptions): string;
};

/**
 * 异步Table运行时选项，数据句柄不进入IR
 * @template TSource 原生数据源句柄类型，关联数据绑定与执行器支持的源；默认 never 表示不接入原生源
 */
export type RenderTableAsyncCommonOptions<TSource = never> = RenderTableCommonOptions &
  Readonly<{
    /** 与data互斥的原始行、规范结果或原生源绑定 */
    dataBindings?: DataInputBindings<TSource>;
    /** 本次请求的数据执行器 */
    dataTransformExecutor?: DataTransformExecutor<TSource>;
    /** 请求取消信号 */
    signal?: AbortSignal;
  }>;

/** 异步Table保留同步入口的string/artifact返回选择 */
export type RenderTableAsync = {
  /**
   * 异步完成数据准备并返回 SVG 与表格编译产物
   * @template TSource 数据绑定与执行器支持的原生源类型，默认 never 表示不接入原生源
   */
  <TSource = never>(
    spec: IRTable,
    options: RenderTableAsyncCommonOptions<TSource> & { artifacts: true },
  ): Promise<RenderTableArtifactResult>;
  /**
   * 异步完成数据准备并返回 SVG 字符串
   * @template TSource 数据绑定与执行器支持的原生源类型，默认 never 表示不接入原生源
   */
  <TSource = never>(
    spec: IRTable,
    options?: RenderTableAsyncCommonOptions<TSource> & { artifacts?: false },
  ): Promise<string>;
};
