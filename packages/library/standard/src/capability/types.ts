import type { AnyCompositeDefinition } from '@retikz/core';

/**
 * Standard 能力的结构化组合单元
 * @description 用稳定名称分组一组 Core composite definitions，不参与 provider lookup
 */
export type StandardCapabilityModule = Readonly<{
  /** bundle 内用于去重和诊断的非空名称 */
  name: string;
  /** 按声明顺序贡献给 Core compile options 的 composite definitions */
  composites: ReadonlyArray<AnyCompositeDefinition>;
}>;

/**
 * Standard 能力的显式只读组合结果
 * @description 保留 module 顺序，并提供可直接传给 Core 的确定性 composite 列表
 */
export type StandardBundle = Readonly<{
  /** bundle 中按声明顺序排列的 module 名称 */
  modules: ReadonlyArray<string>;
  /** 可直接合并或传递给 Core 的编译选项片段 */
  compile: Readonly<{
    /** bundle 按 module 与 definition 声明顺序组合的必填 composite 列表 */
    composites: ReadonlyArray<AnyCompositeDefinition>;
  }>;
}>;
